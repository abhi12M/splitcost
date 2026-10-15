"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { liveQuery } from "dexie";

import {
  editExpense,
  getGroup,
  loadGroupDetails,
  type EditExpenseInterface,
  type GroupDashboardInterface,
  type GroupResponse,
} from "@/lib/storage";
import {
  expenseFormToResponse,
  readCachedDashboard,
  readCachedExpense,
  readCachedGroup,
  writeCachedDashboard,
  writeCachedExpense,
} from "@/lib/offline/cache";
import { getOfflineDb, type LocalGroupRecord } from "@/lib/offline/db";
import { getLocalGroup, localDashboard } from "@/lib/offline/localGroups";
import { isOfflineError, isOnline, subscribeOnline } from "@/lib/offline/network";
import { trackSync } from "@/lib/offline/syncActivity";
import { LOCAL_GROUP_SYNCED_EVENT } from "@/lib/offline/syncLocalGroups";

/** A local change applied on top of loaded data, e.g. from a realtime broadcast. */
type LocalChange<T> = {
  apply: (data: NonNullable<T>) => NonNullable<T>;
  /** The group revision the change produced; lets a load skip changes it already includes. */
  revision?: number;
};

type ResourceCache<T> = {
  /** The last saved copy, shown at once while the server is asked. */
  read: (key: string) => Promise<T | null>;
  /** Saves what is on screen, so the next visit (or an offline one) starts from it. */
  write: (key: string, data: NonNullable<T>) => void;
};

function useResource<T>(
  key: string,
  load: (id: string) => Promise<T>,
  getRevision?: (data: NonNullable<T>) => number | undefined,
  cache?: ResourceCache<T>
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(key));
  // True while the data on screen is the saved copy and the server hasn't
  // confirmed it (still loading, or offline).
  const [fromCache, setFromCache] = useState(false);
  const requestId = useRef(0);
  const dataRef = useRef<T | null>(null);
  dataRef.current = data;
  const inFlightRef = useRef(false);
  // Local changes applied while a load was in flight (or before the first one
  // landed). The load's snapshot may predate them, so they are replayed on top
  // of its result instead of being wiped out by it.
  const pendingChangesRef = useRef<LocalChange<T>[]>([]);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  // Set once data has come from somewhere other than the saved copy, so only
  // real data is written back to it.
  const loadedRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!key) {
      setData(null);
      setLoading(false);
      return null;
    }

    const currentRequestId = ++requestId.current;
    inFlightRef.current = true;
    // Only the first load shows a loading state. A later reload (e.g. after a
    // realtime expense change) keeps the current data on screen and swaps the
    // result in place, so scroll position and open dialogs survive.
    if (dataRef.current === null) setLoading(true);
    try {
      const next = await load(key);
      // A newer load has started since; its result is the one that counts.
      if (currentRequestId !== requestId.current) return next;

      // Replay, in arrival order, the changes this snapshot may not include:
      // those newer than its revision, or all of them when either side has no
      // revision. Each change is safe to apply twice, so replaying one the
      // snapshot already has does no harm.
      const snapshotRevision = next && getRevision ? getRevision(next as NonNullable<T>) : undefined;
      const replay = pendingChangesRef.current.filter(
        (change) =>
          snapshotRevision === undefined || change.revision === undefined || change.revision > snapshotRevision
      );
      pendingChangesRef.current = [];
      const merged = next
        ? replay.reduce((current, change) => change.apply(current), next as NonNullable<T>)
        : next;
      loadedRef.current = true;
      setFromCache(false);
      setData(merged);
      return merged;
    } catch (error) {
      // Offline (or the request failed): keep whatever is on screen, which may
      // be the saved copy. Only the newest load decides.
      if (currentRequestId === requestId.current && !isOfflineError(error)) {
        console.error("load failed:", error);
      }
      return dataRef.current;
    } finally {
      if (currentRequestId === requestId.current) {
        inFlightRef.current = false;
        setLoading(false);
      }
    }
  }, [key, load, getRevision]);

  /** Applies a local change now, and keeps it if a load could still overwrite it. */
  const applyChange = useCallback(
    (apply: LocalChange<T>["apply"], revision?: number) => {
      if (inFlightRef.current || dataRef.current === null) {
        pendingChangesRef.current.push({ apply, revision });
      }
      setData((current) => (current ? apply(current as NonNullable<T>) : current));
    },
    []
  );

  useEffect(() => {
    // A new key starts from scratch, so its first load shows the loading state.
    setData(null);
    dataRef.current = null;
    pendingChangesRef.current = [];
    loadedRef.current = false;
    setFromCache(false);
    let cancelled = false;

    // Show the saved copy first (a quick local read), then ask the server.
    // Reading it first means an offline load can't fail before it shows.
    const read = cacheRef.current?.read;
    const start = async () => {
      if (key && read) {
        const cached = await read(key).catch(() => null);
        if (cancelled) return;
        if (cached && dataRef.current === null) {
          dataRef.current = cached;
          setData(cached);
          setFromCache(true);
          setLoading(false);
        }
      }
      if (!cancelled) void refresh();
    };
    void start();
    return () => {
      cancelled = true;
      requestId.current += 1;
    };
  }, [refresh, key]);

  // Keep the saved copy in step with what is on screen (fresh loads, realtime
  // changes applied in place).
  useEffect(() => {
    if (!key || !data || !loadedRef.current) return;
    cacheRef.current?.write(key, data as NonNullable<T>);
  }, [key, data]);

  return { data, loading, refresh, setData, applyChange, fromCache };
}

const dashboardRevision = (dashboard: GroupDashboardInterface) => dashboard.group.revision;
const groupRevision = (group: GroupResponse) => group.revision;
const expenseGroupRevision = (details: EditExpenseInterface) => details.group.revision;

/** Writes only synced groups: a local group already lives on the device. */
function writeUnlessLocal(groupId: string, write: () => Promise<void>) {
  void getLocalGroup(groupId).then((local) => {
    if (!local) void write();
  });
}

const dashboardCache: ResourceCache<GroupDashboardInterface | null> = {
  read: readCachedDashboard,
  write: (groupId, data) => writeUnlessLocal(groupId, () => writeCachedDashboard(data)),
};

const groupCache: ResourceCache<GroupResponse | null> = {
  read: readCachedGroup,
  write: () => {},
};

const expenseCache: ResourceCache<EditExpenseInterface | null> = {
  read: readCachedExpense,
  write: (_expenseId, data) => writeUnlessLocal(data.group.id, () => writeCachedExpense(data)),
};

/**
 * Reloads when it may have missed changes: on reconnecting, and when a group
 * created on this device has just reached the server.
 */
function useCatchUp(groupId: string, refresh: () => Promise<unknown>) {
  useEffect(() => {
    if (!groupId) return;
    let wasOnline = isOnline();
    const unsubscribe = subscribeOnline(() => {
      const nowOnline = isOnline();
      if (nowOnline && !wasOnline) void trackSync(() => refresh());
      wasOnline = nowOnline;
    });
    const onSynced = (event: Event) => {
      if ((event as CustomEvent<{ groupId: string }>).detail?.groupId === groupId) void refresh();
    };
    window.addEventListener(LOCAL_GROUP_SYNCED_EVENT, onSynced);
    return () => {
      unsubscribe();
      window.removeEventListener(LOCAL_GROUP_SYNCED_EVENT, onSynced);
    };
  }, [groupId, refresh]);
}

/**
 * Follows a local group's record, changed in this tab or another, so its
 * screens stay current. When the record goes away (synced, or discarded in
 * another tab) the screen reloads from the server.
 */
function useLocalGroupUpdates(groupId: string, onChange: (record: LocalGroupRecord | undefined) => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const db = getOfflineDb();
    if (!groupId || !db) return;
    let first = true;
    let hadRecord = false;
    const subscription = liveQuery(() => db.localGroups.get(groupId)).subscribe({
      next: (record) => {
        // The first value is the current state, which the load already has.
        const changed = !first && (record || hadRecord);
        first = false;
        hadRecord = Boolean(record);
        if (changed) onChangeRef.current(record);
      },
      error: (error) => console.error("local group watch failed:", error),
    });
    return () => subscription.unsubscribe();
  }, [groupId]);
}

const EXPENSE_BATCH_MS = 300;
const EXPENSE_BATCH_MAX = 3;

export function useGroupDashboard(groupId: string) {
  const resource = useResource<GroupDashboardInterface | null>(
    groupId,
    loadGroupDetails,
    dashboardRevision,
    dashboardCache
  );
  const { refresh, applyChange, setData } = resource;
  useCatchUp(groupId, refresh);
  useLocalGroupUpdates(groupId, (record) => {
    if (record) setData(localDashboard(record));
    else void refresh();
  });

  const resourceDataRef = useRef(resource.data);
  resourceDataRef.current = resource.data;
  const queuedRef = useRef(new Set<string>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const flushExpenses = useCallback(async () => {
    const ids = Array.from(queuedRef.current);
    queuedRef.current.clear();
    if (!ids.length) return;
    // A burst (e.g. someone bulk-editing) is cheaper as one dashboard load.
    if (ids.length > EXPENSE_BATCH_MAX) {
      await refresh();
      return;
    }
    try {
      for (const id of ids) {
        const details = await editExpense(id);
        if (!details) {
          applyChange((prev) => (prev ? { ...prev, expenses: prev.expenses.filter((e) => e.id !== id) } : prev));
          continue;
        }
        const next = expenseFormToResponse(details.expense, details.group);
        applyChange((prev) =>
          prev
            ? {
                ...prev,
                expenses: prev.expenses.some((e) => e.id === id)
                  ? prev.expenses.map((e) => (e.id === id ? next : e))
                  : [next, ...prev.expenses],
              }
            : prev
        );
        void writeCachedExpense(details);
      }
    } catch {
      await refresh();
    }
  }, [applyChange, refresh]);

  /**
   * Applies another session's expense change. Deletes need no request; adds
   * and edits fetch only that expense (its broadcast carries no data), unless
   * the screen already has that revision.
   */
  const applyRemoteExpenseChange = useCallback(
    (event: "INSERT" | "UPDATE" | "DELETE", expenseId: string, revision?: number) => {
      if (event === "DELETE") {
        applyChange((prev) => (prev ? { ...prev, expenses: prev.expenses.filter((e) => e.id !== expenseId) } : prev));
        return;
      }
      const current = resourceDataRef.current?.expenses.find((e) => e.id === expenseId);
      if (revision !== undefined && current?.revision !== undefined && current.revision >= revision) return;
      queuedRef.current.add(expenseId);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flushExpenses(), EXPENSE_BATCH_MS);
    },
    [applyChange, flushExpenses]
  );

  return { ...resource, applyRemoteExpenseChange };
}

export function useGroup(groupId: string) {
  const resource = useResource<GroupResponse | null>(groupId, getGroup, groupRevision, groupCache);
  useCatchUp(groupId, resource.refresh);
  return resource;
}

export function useExpense(expenseId: string) {
  return useResource<EditExpenseInterface | null>(expenseId, editExpense, expenseGroupRevision, expenseCache);
}
