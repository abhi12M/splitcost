import Dexie, { type Table } from "dexie";

import type { ActivityCursor, ActivityEvent } from "@/lib/activity/types";
import type {
  EditExpenseInterface,
  ExpenseResponse,
  GroupDashboardInterface,
  GroupOverviewItemInterface,
  GroupResponse,
} from "@/lib/storage";

/** A synced group's dashboard as last loaded, for instant and offline reads. */
export type CachedDashboard = {
  groupId: string;
  data: GroupDashboardInterface;
  savedAt: number;
};

/** One expense as its view / edit screens load it. */
export type CachedExpense = {
  expenseId: string;
  groupId: string;
  data: EditExpenseInterface;
  savedAt: number;
};

/**
 * The newest activity of a group's feed (one filter), or of one expense's
 * history, as last loaded. `key` is "group:<groupId>|<filter>|<limit>" or
 * "expense:<expenseId>".
 */
export type CachedActivity = {
  key: string;
  groupId?: string;
  events: ActivityEvent[];
  nextCursor?: ActivityCursor | null;
  savedAt: number;
};

/** A card on the "My groups" list. */
export type CachedGroupSummary = GroupOverviewItemInterface & { savedAt: number };

/**
 * Where a group created on this device is in reaching the server:
 * - draft: editable, waiting to be sent
 * - submitting: being sent; locked in every tab
 * - unknown: sent, but no definite answer (e.g. the response was lost);
 *   stays locked and the same snapshot is sent again until the server answers
 * - rejected: the server refused it and saved nothing; editable again
 */
export type LocalSyncState = "draft" | "submitting" | "unknown" | "rejected";

/** What `/api/groups/import` receives. */
export type LocalGroupImport = {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  members: { id: string; name: string }[];
  expenses: {
    id: string;
    description: string;
    notes: string | null;
    amount: number;
    paidByUserId: string | null;
    payers: { userId: string; amount: number }[];
    splitType: string;
    category: string;
    subcategory: string;
    date: string;
    participants: { userId: string; amount: number | null; percent: number | null }[];
    createdAt: string;
    updatedAt: string;
  }[];
};

/** A group created on this device that the server doesn't have yet. */
export type LocalGroupRecord = {
  id: string;
  state: LocalSyncState;
  group: GroupResponse;
  expenses: ExpenseResponse[];
  createdAt: string;
  updatedAt: string;
  /** Frozen when sending starts; every retry sends exactly this. */
  snapshot?: LocalGroupImport;
  /** Why the server refused it (state "rejected"). */
  error?: string;
  attempts?: number;
  nextAttemptAt?: number;
};

class OfflineDatabase extends Dexie {
  dashboards!: Table<CachedDashboard, string>;
  expenses!: Table<CachedExpense, string>;
  groupSummaries!: Table<CachedGroupSummary, string>;
  localGroups!: Table<LocalGroupRecord, string>;
  activity!: Table<CachedActivity, string>;

  constructor() {
    super("splitcost-offline");
    this.version(1).stores({
      dashboards: "&groupId",
      expenses: "&expenseId, groupId",
      groupSummaries: "&id",
      localGroups: "&id, state",
    });
    this.version(2).stores({
      activity: "&key, groupId",
    });
  }
}

let db: OfflineDatabase | null | undefined;

/** Null where IndexedDB isn't available (server render, some private modes). */
export function getOfflineDb(): OfflineDatabase | null {
  if (db !== undefined) return db;
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return null;
  try {
    db = new OfflineDatabase();
  } catch {
    db = null;
  }
  return db;
}

/** Runs an IndexedDB read/write; a storage failure never breaks the screen. */
export async function withDb<T>(fallback: T, run: (db: OfflineDatabase) => Promise<T>): Promise<T> {
  const database = getOfflineDb();
  if (!database) return fallback;
  try {
    return await run(database);
  } catch (error) {
    console.error("offline storage error:", error);
    return fallback;
  }
}

/** Asks the browser not to evict the local data under storage pressure. */
export function requestPersistentStorage() {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
  void navigator.storage.persisted().then((persisted) => {
    if (!persisted) void navigator.storage.persist();
  });
}
