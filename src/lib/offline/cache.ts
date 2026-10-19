// Last-loaded copies of synced groups. Screens show these instantly and while
// offline, and replace them with fresh data from the server in the background.

import type {
  EditExpenseInterface,
  ExpenseCategoryPatchResponse,
  ExpenseFormInterface,
  ExpenseResponse,
  GroupDashboardInterface,
  GroupOverviewItemInterface,
  GroupResponse,
} from "@/lib/storage";
import type { Table } from "dexie";
import type { ActivityCursor, ActivityEvent } from "@/lib/activity/types";
import { withDb, type CachedActivity, type CachedGroupSummary } from "./db";
import { expenseResponseToForm } from "./localGroups";

export function readCachedDashboard(groupId: string) {
  return withDb<GroupDashboardInterface | null>(null, async (db) => (await db.dashboards.get(groupId))?.data ?? null);
}

export function readCachedDashboardSavedAt(groupId: string) {
  return withDb<number | null>(null, async (db) => (await db.dashboards.get(groupId))?.savedAt ?? null);
}

export function writeCachedDashboard(data: GroupDashboardInterface) {
  if (!data?.group?.id) return Promise.resolve();
  return withDb(undefined, async (db) => {
    await db.transaction("rw", db.dashboards, db.groupSummaries, async () => {
      await db.dashboards.put({ groupId: data.group.id, data, savedAt: Date.now() });
      // Keep the group's card in My groups in step, whoever made the change.
      if (Array.isArray(data.expenses)) await syncSummaryTotals(db.groupSummaries, data.group.id, data.expenses);
    });
  });
}

export function isDashboardExpense(value: unknown): value is ExpenseResponse {
  const expense = value as Partial<ExpenseResponse> | null;
  return (
    Boolean(expense) &&
    typeof expense?.id === "string" &&
    typeof expense.createdAt === "string" &&
    typeof expense.date === "string" &&
    Array.isArray(expense.participants) &&
    expense.participants.every((participant) => Boolean(participant?.user))
  );
}

/** The dashboard's own order: newest date first, then newest added. */
function newestFirst(a: ExpenseResponse, b: ExpenseResponse) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return Date.parse(b.createdAt) - Date.parse(a.createdAt) || 0;
}

/** The list with this expense added at its place, or replacing the one with the same id. */
export function withExpenseInList(expenses: ExpenseResponse[], expense: ExpenseResponse) {
  return [expense, ...expenses.filter((item) => item.id !== expense.id)].sort(newestFirst);
}

/**
 * Brings a group's card in the My groups list in step with its expenses: the
 * count, the total (as the server sums it, settlements included) and the time
 * of the latest activity. Does nothing if the group has no saved card.
 */
async function syncSummaryTotals(
  summaries: Table<CachedGroupSummary, string>,
  groupId: string,
  expenses: ExpenseResponse[]
) {
  const summary = await summaries.get(groupId);
  if (!summary) return;
  const latest = expenses.reduce<string | null>((max, expense) => {
    const at = expense.updatedAt ?? expense.createdAt;
    return !max || at > max ? at : max;
  }, null);
  await summaries.put({
    ...summary,
    expenseCount: expenses.length,
    totalExpenses: expenses.reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0),
    latestExpenseActivityAt: latest,
  });
}

/**
 * Saves an expense the server just saved, so the screens that show it open
 * with it already there: in the saved dashboard (added at its place, or
 * replacing the same one), and as the expense's own saved copy for its view /
 * edit screens, replacing any older one. Without a saved group to build that
 * copy from, the older copy is dropped rather than left stale.
 */
export function upsertCachedDashboardExpense(groupId: string, expense: unknown) {
  if (!groupId || !isDashboardExpense(expense)) return Promise.resolve();
  return withDb(undefined, async (db) => {
    await db.transaction("rw", db.dashboards, db.expenses, db.groupSummaries, async () => {
      const cached = await db.dashboards.get(groupId);
      if (cached) {
        const expenses = withExpenseInList(cached.data.expenses, expense);
        await db.dashboards.put({ ...cached, data: { ...cached.data, expenses } });
        await syncSummaryTotals(db.groupSummaries, groupId, expenses);
      }
      const group = cached?.data.group ?? (await db.expenses.get(expense.id))?.data.group;
      if (!group) {
        await db.expenses.delete(expense.id);
        return;
      }
      await db.expenses.put({
        expenseId: expense.id,
        groupId,
        data: { group, expense: expenseResponseToForm(expense) },
        savedAt: Date.now(),
      });
    });
  });
}

/**
 * Keeps the saved group (name, members, currency) in step with a fresh load or
 * a save: in the saved dashboard, in each saved expense of the group (their
 * view / edit screens read member names from it), and on its card in the My
 * groups list.
 */
export function patchCachedGroup(group: GroupResponse) {
  if (!group?.id || !Array.isArray(group.members)) return Promise.resolve();
  return withDb(undefined, async (db) => {
    await db.transaction("rw", db.dashboards, db.expenses, db.groupSummaries, async () => {
      const cached = await db.dashboards.get(group.id);
      if (cached) await db.dashboards.put({ ...cached, data: { ...cached.data, group } });
      await db.expenses
        .where("groupId")
        .equals(group.id)
        .modify((row) => {
          row.data = { ...row.data, group };
        });
      const summary = await db.groupSummaries.get(group.id);
      if (summary) {
        await db.groupSummaries.put({
          ...summary,
          name: group.name,
          currency: group.currency,
          members: group.members.map((member) => member.name),
          memberCount: group.members.length,
        });
      }
    });
  });
}

export function readCachedGroup(groupId: string) {
  return readCachedDashboard(groupId).then((dashboard) => dashboard?.group ?? null);
}

/**
 * An expense for its view / edit screen: as last opened, or else built from
 * the cached dashboard (which has everything except the notes and receipt).
 */
export function readCachedExpense(expenseId: string) {
  return withDb<EditExpenseInterface | null>(null, async (db) => {
    const cached = await db.expenses.get(expenseId);
    if (cached) return cached.data;
    let found: EditExpenseInterface | null = null;
    await db.dashboards.each((entry) => {
      if (found) return;
      const expense = entry.data.expenses.find((item) => item.id === expenseId);
      if (expense) found = { group: entry.data.group, expense: expenseResponseToForm(expense) };
    });
    return found;
  });
}

export function writeCachedExpense(details: EditExpenseInterface) {
  if (!details?.expense?.id || !details.group?.id) return Promise.resolve();
  return withDb(undefined, async (db) => {
    await db.expenses.put({
      expenseId: details.expense.id,
      groupId: details.group.id,
      // The receipt's signed URL expires; a cached copy would only show a broken image.
      data: { ...details, expense: { ...details.expense, attachment: null } },
      savedAt: Date.now(),
    });
  });
}

/**
 * Applies a saved category change to the expense's own saved copy and to its
 * entry in the saved dashboard, so both show the new category at once.
 */
export function patchCachedExpenseCategory(change: ExpenseCategoryPatchResponse) {
  if (!change?.id) return Promise.resolve();
  const apply = <T extends { category: string; subcategory: string; updatedAt?: string; revision?: number }>(expense: T): T => ({
    ...expense,
    category: change.category,
    subcategory: change.subcategory,
    updatedAt: change.updatedAt ?? expense.updatedAt,
    revision: change.revision ?? expense.revision,
  });
  return withDb(undefined, async (db) => {
    await db.transaction("rw", db.dashboards, db.expenses, db.groupSummaries, async () => {
      const row = await db.expenses.get(change.id);
      if (row) await db.expenses.put({ ...row, data: { ...row.data, expense: apply(row.data.expense) } });
      const dashboards = await db.dashboards.filter((entry) => entry.data.expenses.some((e) => e.id === change.id)).toArray();
      for (const entry of dashboards) {
        const expenses = entry.data.expenses.map((e) => (e.id === change.id ? apply(e) : e));
        await db.dashboards.put({ ...entry, data: { ...entry.data, expenses } });
        await syncSummaryTotals(db.groupSummaries, entry.groupId, expenses);
      }
    });
  });
}

/**
 * Records that an expense now has (or no longer has) a receipt, in its own
 * saved copy and its entry in the saved dashboard, so the receipt marker is
 * right at once. The receipt itself is never saved here.
 */
export function patchCachedExpenseReceipt(expenseId: string, hasReceipt: boolean) {
  if (!expenseId) return Promise.resolve();
  const marker = (current?: string | null) => (hasReceipt ? current ?? "attached" : null);
  return withDb(undefined, async (db) => {
    await db.transaction("rw", db.dashboards, db.expenses, async () => {
      const row = await db.expenses.get(expenseId);
      if (row) {
        const expense = { ...row.data.expense, attachment: null, attachmentDataUrl: marker(row.data.expense.attachmentDataUrl) };
        await db.expenses.put({ ...row, data: { ...row.data, expense } });
      }
      const dashboards = await db.dashboards.filter((entry) => entry.data.expenses.some((e) => e.id === expenseId)).toArray();
      for (const entry of dashboards) {
        await db.dashboards.put({
          ...entry,
          data: {
            ...entry.data,
            expenses: entry.data.expenses.map((e) =>
              e.id === expenseId ? { ...e, attachment_data_url: marker(e.attachment_data_url), attachmentDataUrl: marker(e.attachmentDataUrl) } : e
            ),
          },
        });
      }
    });
  });
}

/** The saved newest activity for a group feed ("group:…") or an expense ("expense:…"). */
export function readCachedActivity(key: string) {
  return withDb<CachedActivity | null>(null, async (db) => (await db.activity.get(key)) ?? null);
}

export function writeCachedActivity(
  key: string,
  value: { groupId?: string; events: ActivityEvent[]; nextCursor?: ActivityCursor | null }
) {
  return withDb(undefined, async (db) => {
    await db.activity.put({ key, ...value, savedAt: Date.now() });
  });
}

/** Forgets a deleted expense: its own saved copy, its history, and its place in the saved dashboard. */
export function deleteCachedExpense(expenseId: string) {
  return withDb(undefined, async (db) => {
    await db.transaction("rw", db.dashboards, db.expenses, db.groupSummaries, db.activity, async () => {
      await db.expenses.delete(expenseId);
      await db.activity.delete(`expense:${expenseId}`);
      const dashboards = await db.dashboards.filter((entry) => entry.data.expenses.some((e) => e.id === expenseId)).toArray();
      for (const entry of dashboards) {
        const expenses = entry.data.expenses.filter((e) => e.id !== expenseId);
        await db.dashboards.put({ ...entry, data: { ...entry.data, expenses } });
        await syncSummaryTotals(db.groupSummaries, entry.groupId, expenses);
      }
    });
  });
}

/** Forgets everything cached for a group, e.g. after it was deleted. */
export function deleteCachedGroup(groupId: string) {
  return withDb(undefined, async (db) => {
    await db.transaction("rw", db.dashboards, db.expenses, db.groupSummaries, db.activity, async () => {
      await db.dashboards.delete(groupId);
      await db.expenses.where("groupId").equals(groupId).delete();
      await db.groupSummaries.delete(groupId);
      await db.activity.where("groupId").equals(groupId).delete();
    });
  });
}

export function readCachedGroupSummaries(groupIds: string[]) {
  return withDb<GroupOverviewItemInterface[]>([], async (db) => {
    const rows = await db.groupSummaries.bulkGet(groupIds);
    return rows.flatMap((row) => {
      if (!row) return [];
      const { savedAt: _savedAt, ...summary } = row;
      return [summary];
    });
  });
}

export function writeCachedGroupSummaries(summaries: GroupOverviewItemInterface[]) {
  const savedAt = Date.now();
  return withDb(undefined, async (db) => {
    await db.groupSummaries.bulkPut(summaries.map((summary) => ({ ...summary, savedAt })));
  });
}

/**
 * The dashboard's shape for one expense, from the shape the expense's own
 * endpoint returns. Names come from the group's member list.
 */
export function expenseFormToResponse(
  expense: ExpenseFormInterface,
  group: GroupResponse
): ExpenseResponse {
  const names = new Map(group.members.map((member) => [member.id, member]));
  const user = (id: string) => names.get(id) ?? { id, name: "" };
  const payers = (expense.payers ?? []).map((payer) => ({ user: user(payer.userId), amount: payer.amount }));
  return {
    id: expense.id,
    groupId: group.id,
    amount: Number(expense.amount),
    description: expense.description,
    notes: expense.notes ?? null,
    currency: expense.currency,
    paidBy: expense.paidByUserId ? user(expense.paidByUserId) : null,
    payers,
    splitType: expense.splitType,
    category: expense.category,
    subcategory: expense.subcategory,
    date: expense.date,
    participants: expense.participants.map((participant) => ({
      user: user(participant.userId),
      amount: participant.amount,
      percent: participant.percent,
    })),
    attachment_data_url: expense.attachmentDataUrl ?? null,
    createdAt: expense.createdAt ?? new Date().toISOString(),
    updatedAt: expense.updatedAt,
    revision: expense.revision,
  };
}
