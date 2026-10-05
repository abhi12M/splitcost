"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  editExpense,
  getGroup,
  loadGroupDetails,
  type EditExpenseInterface,
  type GroupDashboardInterface,
  type GroupResponse,
} from "@/lib/storage";

/** A local change applied on top of loaded data, e.g. from a realtime broadcast. */
type LocalChange<T> = {
  apply: (data: NonNullable<T>) => NonNullable<T>;
  /** The group revision the change produced; lets a load skip changes it already includes. */
  revision?: number;
};

function useResource<T>(
  key: string,
  load: (id: string) => Promise<T>,
  getRevision?: (data: NonNullable<T>) => number | undefined
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(key));
  const requestId = useRef(0);
  const dataRef = useRef<T | null>(null);
  dataRef.current = data;
  const inFlightRef = useRef(false);
  // Local changes applied while a load was in flight (or before the first one
  // landed). The load's snapshot may predate them, so they are replayed on top
  // of its result instead of being wiped out by it.
  const pendingChangesRef = useRef<LocalChange<T>[]>([]);

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
      setData(merged);
      return merged;
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
    void refresh();
    return () => {
      requestId.current += 1;
    };
  }, [refresh]);

  return { data, loading, refresh, setData, applyChange };
}

const dashboardRevision = (dashboard: GroupDashboardInterface) => dashboard.group.revision;
const groupRevision = (group: GroupResponse) => group.revision;
const expenseGroupRevision = (details: EditExpenseInterface) => details.group.revision;

export function useGroupDashboard(groupId: string) {
  return useResource<GroupDashboardInterface | null>(groupId, loadGroupDetails, dashboardRevision);
}

export function useGroup(groupId: string) {
  return useResource<GroupResponse | null>(groupId, getGroup, groupRevision);
}

export function useExpense(expenseId: string) {
  return useResource<EditExpenseInterface | null>(expenseId, editExpense, expenseGroupRevision);
}
