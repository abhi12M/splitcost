// Last-loaded copies of synced groups. Screens show these instantly and while
// offline, and replace them with fresh data from the server in the background.

import type {
  EditExpenseInterface,
  ExpenseFormInterface,
  ExpenseResponse,
  GroupDashboardInterface,
  GroupOverviewItemInterface,
  GroupResponse,
} from "@/lib/storage";
import { withDb } from "./db";
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
    await db.dashboards.put({ groupId: data.group.id, data, savedAt: Date.now() });
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
 * Saves an expense the server just saved, so the screens that show it open
 * with it already there: in the saved dashboard (added at its place, or
 * replacing the same one), and as the expense's own saved copy for its view /
 * edit screens, replacing any older one. Without a saved group to build that
 * copy from, the older copy is dropped rather than left stale.
 */
export function upsertCachedDashboardExpense(groupId: string, expense: unknown) {
  if (!groupId || !isDashboardExpense(expense)) return Promise.resolve();
  return withDb(undefined, async (db) => {
    await db.transaction("rw", db.dashboards, db.expenses, async () => {
      const cached = await db.dashboards.get(groupId);
      if (cached) {
        const expenses = withExpenseInList(cached.data.expenses, expense);
        await db.dashboards.put({ ...cached, data: { ...cached.data, expenses } });
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

/** Keeps the cached dashboard's group (name, members) in step with a fresh load. */
export function patchCachedGroup(group: GroupResponse) {
  if (!group?.id) return Promise.resolve();
  return withDb(undefined, async (db) => {
    const cached = await db.dashboards.get(group.id);
    if (cached) await db.dashboards.put({ ...cached, data: { ...cached.data, group } });
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

/** Forgets a deleted expense: its own saved copy, and its place in the saved dashboard. */
export function deleteCachedExpense(expenseId: string) {
  return withDb(undefined, async (db) => {
    await db.transaction("rw", db.dashboards, db.expenses, async () => {
      await db.expenses.delete(expenseId);
      const dashboards = await db.dashboards.filter((entry) => entry.data.expenses.some((e) => e.id === expenseId)).toArray();
      for (const entry of dashboards) {
        await db.dashboards.put({
          ...entry,
          data: { ...entry.data, expenses: entry.data.expenses.filter((e) => e.id !== expenseId) },
        });
      }
    });
  });
}

/** Forgets everything cached for a group, e.g. after it was deleted. */
export function deleteCachedGroup(groupId: string) {
  return withDb(undefined, async (db) => {
    await db.transaction("rw", db.dashboards, db.expenses, db.groupSummaries, async () => {
      await db.dashboards.delete(groupId);
      await db.expenses.where("groupId").equals(groupId).delete();
      await db.groupSummaries.delete(groupId);
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
