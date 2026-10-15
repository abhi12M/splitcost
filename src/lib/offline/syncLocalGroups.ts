// Sends groups created offline to the server, one atomic import each.
//
//   draft ──send──▶ submitting ──▶ synced (removed from the device's local store)
//                                ├─▶ rejected → editable again, shows the reason
//                                └─▶ unknown  → stays locked; the same snapshot is
//                                              sent again until the server answers
//
// The import is idempotent: the server recognises a repeat of the same
// snapshot, so resending after a lost response never creates a second group.

import { getEncryptedItem, setEncryptedItem } from "@/lib/localStorage";
import { LOCAL_GROUPS_KEY } from "@/lib/constants";
import { writeCachedDashboard, writeCachedGroupSummaries } from "./cache";
import { withDb, type LocalGroupImport, type LocalGroupRecord, type LocalSyncState } from "./db";
import {
  buildImportPayload,
  LOCAL_GROUPS_CHANGED_EVENT,
  localDashboard,
  localGroupSummary,
} from "./localGroups";
import { checkServerReachable, isOnline, subscribeOnline, trackedFetch } from "./network";
import { trackSync } from "./syncActivity";

export const LOCAL_GROUP_SYNCED_EVENT = "splitcost:local-group-synced";
export const LOCAL_GROUP_REKEYED_EVENT = "splitcost:local-group-rekeyed";

const LOCK_NAME = "splitcost-local-group-sync";
const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_INTERVAL_MS = 30_000;
const EDIT_DEBOUNCE_MS = 1_500;
const MAX_BACKOFF_MS = 5 * 60_000;

type Outcome =
  | { kind: "synced"; revision?: number }
  | { kind: "rejected"; error: string }
  | { kind: "conflict" }
  | { kind: "retry"; definitelyNotSaved: boolean };

function backoff(attempts: number) {
  return Math.min(5_000 * 2 ** attempts, MAX_BACKOFF_MS);
}

function dispatch(name: string, detail?: unknown) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Holds a cross-tab lock so only one tab sends at a time; skips if another tab holds it. */
async function withSyncLock(run: () => Promise<void>) {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) {
    await run();
    return;
  }
  await locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
    if (lock) await run();
  });
}

async function sendImport(snapshot: LocalGroupImport): Promise<Outcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await trackedFetch("/api/groups/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
      signal: controller.signal,
    });
    const payload = await res.json().catch(() => null);
    if (res.ok) return { kind: "synced", revision: payload?.revision };
    if (res.status === 409 && payload?.code === "IMPORT_CONFLICT") return { kind: "conflict" };
    if (res.status === 400 || res.status === 413) {
      return {
        kind: "rejected",
        error: res.status === 413 ? "This group is too large to sync." : payload?.error || "The server couldn't accept this group.",
      };
    }
    // Refused before anything ran (rate limit), so nothing was saved.
    if (res.status === 429) return { kind: "retry", definitelyNotSaved: true };
    return { kind: "retry", definitelyNotSaved: false };
  } catch {
    // The request may have reached the server before the connection dropped.
    return { kind: "retry", definitelyNotSaved: false };
  } finally {
    clearTimeout(timer);
  }
}

/** Takes the snapshot to send, moving a draft to "submitting" in the same transaction. */
function beginSubmit(groupId: string) {
  return withDb<{ snapshot: LocalGroupImport; previous: LocalSyncState } | null>(null, (db) =>
    db.transaction("rw", db.localGroups, async () => {
      const record = await db.localGroups.get(groupId);
      if (!record) return null;
      const previous = record.state;
      if (previous === "rejected") return null;
      if (previous === "draft" || !record.snapshot) record.snapshot = buildImportPayload(record);
      record.state = "submitting";
      await db.localGroups.put(record);
      return { snapshot: record.snapshot, previous };
    })
  );
}

async function finishSynced(groupId: string, revision?: number) {
  const record = await withDb<LocalGroupRecord | null>(null, (db) =>
    db.transaction("rw", db.localGroups, async () => {
      const current = await db.localGroups.get(groupId);
      if (current) await db.localGroups.delete(groupId);
      return current ?? null;
    })
  );
  if (!record) return;
  // The server now holds exactly this snapshot; seed the cache with it so the
  // group keeps showing (and works offline) without waiting for a reload.
  const dashboard = localDashboard(record);
  await writeCachedDashboard({ ...dashboard, group: { ...dashboard.group, revision: revision ?? 1 } });
  await writeCachedGroupSummaries([localGroupSummary(record)]);
  dispatch(LOCAL_GROUPS_CHANGED_EVENT);
  dispatch(LOCAL_GROUP_SYNCED_EVENT, { groupId });
}

function updateRecord(groupId: string, change: (record: LocalGroupRecord) => void) {
  return withDb(undefined, (db) =>
    db.transaction("rw", db.localGroups, async () => {
      const record = await db.localGroups.get(groupId);
      if (!record) return;
      change(record);
      await db.localGroups.put(record);
    })
  );
}

/**
 * The server already has a different group under one of these ids. That can't
 * come from this device's own earlier send (its snapshot is frozen), so give
 * the group fresh ids and send it again as a new group.
 */
async function rekey(groupId: string) {
  const newGroupId = crypto.randomUUID();
  await withDb(undefined, (db) =>
    db.transaction("rw", db.localGroups, async () => {
      const record = await db.localGroups.get(groupId);
      if (!record) return;
      const memberIds = new Map(record.group.members.map((member) => [member.id, crypto.randomUUID()]));
      const remap = <T extends { id: string }>(user: T): T => ({ ...user, id: memberIds.get(user.id) ?? user.id });
      const next: LocalGroupRecord = {
        ...record,
        id: newGroupId,
        state: "draft",
        snapshot: undefined,
        error: undefined,
        attempts: 0,
        nextAttemptAt: undefined,
        group: { ...record.group, id: newGroupId, members: record.group.members.map(remap) },
        expenses: record.expenses.map((expense) => ({
          ...expense,
          id: crypto.randomUUID(),
          groupId: newGroupId,
          paidBy: expense.paidBy ? remap(expense.paidBy) : expense.paidBy,
          payers: expense.payers?.map((payer) => ({ ...payer, user: remap(payer.user) })),
          participants: expense.participants.map((participant) => ({ ...participant, user: remap(participant.user) })),
        })),
      };
      await db.localGroups.delete(groupId);
      await db.localGroups.put(next);
    })
  );
  const myGroups = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);
  setEncryptedItem(LOCAL_GROUPS_KEY, myGroups.map((id) => (id === groupId ? newGroupId : id)));
  dispatch(LOCAL_GROUPS_CHANGED_EVENT);
  dispatch(LOCAL_GROUP_REKEYED_EVENT, { from: groupId, to: newGroupId });
}

async function syncOne(groupId: string) {
  const started = await beginSubmit(groupId);
  if (!started) return;
  dispatch(LOCAL_GROUPS_CHANGED_EVENT);

  const outcome = await sendImport(started.snapshot);
  switch (outcome.kind) {
    case "synced":
      await finishSynced(groupId, outcome.revision);
      return;
    case "rejected":
      // The import ran in one transaction that rolled back: nothing was saved.
      await updateRecord(groupId, (record) => {
        record.state = "rejected";
        record.error = outcome.error;
        record.snapshot = undefined;
      });
      break;
    case "conflict":
      await rekey(groupId);
      return;
    case "retry":
      await updateRecord(groupId, (record) => {
        const attempts = (record.attempts ?? 0) + 1;
        record.attempts = attempts;
        record.nextAttemptAt = Date.now() + backoff(attempts);
        if (outcome.definitelyNotSaved && started.previous === "draft") {
          record.state = "draft";
          record.snapshot = undefined;
        } else {
          record.state = "unknown";
        }
      });
      break;
  }
  dispatch(LOCAL_GROUPS_CHANGED_EVENT);
}

let running = false;
let rerun = false;

/** Sends every pending local group. `force` ignores retry back-off (e.g. just reconnected). */
export async function syncLocalGroups({ force = false }: { force?: boolean } = {}) {
  if (!isOnline()) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  try {
    await withSyncLock(async () => {
      const pending = await withDb<LocalGroupRecord[]>([], (db) =>
        db.localGroups.where("state").anyOf("draft", "submitting", "unknown").toArray()
      );
      const due = pending.filter((record) => force || !record.nextAttemptAt || record.nextAttemptAt <= Date.now());
      if (!due.length) return;
      // A failed send leaves its outcome unknown and the group locked, so only
      // send once the server has just answered. The browser's own "online"
      // flag can't tell (it stays on with a server that is down).
      if (!(await checkServerReachable())) return;
      await trackSync(async () => {
        for (const record of due) {
          if (!isOnline()) break;
          await syncOne(record.id);
        }
      });
    });
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      void syncLocalGroups();
    }
  }
}

let started = false;

/** Starts sending local groups whenever the app is online. Safe to call more than once. */
export function startLocalGroupSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  let editTimer: ReturnType<typeof setTimeout> | null = null;
  const soon = () => {
    if (editTimer) clearTimeout(editTimer);
    editTimer = setTimeout(() => void syncLocalGroups(), EDIT_DEBOUNCE_MS);
  };

  let wasOnline = isOnline();
  subscribeOnline(() => {
    const nowOnline = isOnline();
    if (nowOnline && !wasOnline) void syncLocalGroups({ force: true });
    wasOnline = nowOnline;
  });
  window.addEventListener(LOCAL_GROUPS_CHANGED_EVENT, (event) => {
    // Our own state changes also fire this; only edits need a send.
    if (!(event instanceof CustomEvent)) soon();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncLocalGroups();
  });
  setInterval(() => void syncLocalGroups(), RETRY_INTERVAL_MS);
  void syncLocalGroups({ force: true });
}
