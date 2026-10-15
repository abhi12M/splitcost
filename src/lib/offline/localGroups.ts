// Groups created on this device while offline. They live only in IndexedDB
// until the sync engine sends them to the server in one request. Nobody else
// can see or change them before that, so editing them never conflicts.

import type {
  EditExpenseInterface,
  ExpenseFormInterface,
  ExpenseRequest,
  ExpenseResponse,
  GroupDashboardInterface,
  GroupFormRequest,
  GroupOverviewItemInterface,
  GroupResponse,
  UserInterface,
} from "@/lib/storage";
import { validateGroupInput } from "@/lib/validations/group.schema";
import { withDb, type LocalGroupImport, type LocalGroupRecord } from "./db";

export const LOCAL_GROUPS_CHANGED_EVENT = "splitcost:local-groups-changed";

/** States in which the group can still be changed on this device. */
export function isLocalGroupEditable(record: Pick<LocalGroupRecord, "state">) {
  return record.state === "draft" || record.state === "rejected";
}

type CodedError = Error & { code?: string };

function codedError(code: string, message: string): CodedError {
  const error = new Error(message) as CodedError;
  error.code = code;
  return error;
}

function notifyChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LOCAL_GROUPS_CHANGED_EVENT));
}

const nowIso = () => new Date().toISOString();

function sortExpenses(expenses: ExpenseResponse[]) {
  return [...expenses].sort((a, b) =>
    a.date !== b.date ? b.date.localeCompare(a.date) : b.createdAt.localeCompare(a.createdAt)
  );
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getLocalGroup(groupId: string) {
  return withDb<LocalGroupRecord | undefined>(undefined, (db) => db.localGroups.get(groupId));
}

export function listLocalGroups() {
  return withDb<LocalGroupRecord[]>([], (db) => db.localGroups.toArray());
}

export async function findLocalExpense(expenseId: string) {
  const groups = await listLocalGroups();
  for (const record of groups) {
    const expense = record.expenses.find((item) => item.id === expenseId);
    if (expense) return { record, expense };
  }
  return null;
}

export function localDashboard(record: LocalGroupRecord): GroupDashboardInterface {
  return { group: record.group, expenses: sortExpenses(record.expenses) };
}

export function expenseResponseToForm(expense: ExpenseResponse): ExpenseFormInterface {
  return {
    id: expense.id,
    amount: expense.amount,
    description: expense.description,
    notes: expense.notes ?? null,
    currency: expense.currency,
    paidByUserId: expense.payers?.length ? null : expense.paidBy?.id ?? null,
    payers: (expense.payers ?? []).map((payer) => ({ userId: payer.user.id, amount: Number(payer.amount) })),
    splitType: expense.splitType,
    category: expense.category,
    subcategory: expense.subcategory,
    date: expense.date,
    participants: expense.participants.map((participant) => ({
      userId: participant.user.id,
      amount: participant.amount,
      percent: participant.percent,
    })),
    attachmentDataUrl: expense.attachmentDataUrl ?? expense.attachment_data_url ?? null,
    attachment: null,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    revision: expense.revision,
  };
}

export function localExpenseDetails(record: LocalGroupRecord, expense: ExpenseResponse): EditExpenseInterface {
  return { group: record.group, expense: expenseResponseToForm(expense) };
}

export function localGroupSummary(record: LocalGroupRecord): GroupOverviewItemInterface {
  const latest = record.expenses.reduce<string | null>(
    (max, expense) => (!max || expense.updatedAt! > max ? expense.updatedAt ?? expense.createdAt : max),
    null
  );
  return {
    id: record.id,
    name: record.group.name,
    currency: record.group.currency,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    members: record.group.members.map((member) => member.name),
    memberCount: record.group.members.length,
    expenseCount: record.expenses.length,
    totalExpenses: record.expenses.reduce((sum, expense) => sum + expense.amount, 0),
    latestExpenseActivityAt: latest,
  };
}

/** The exact request body the server imports; built once, when sending starts. */
export function buildImportPayload(record: LocalGroupRecord): LocalGroupImport {
  return {
    id: record.id,
    name: record.group.name,
    currency: record.group.currency,
    createdAt: record.createdAt,
    members: record.group.members.map(({ id, name }) => ({ id, name })),
    expenses: record.expenses.map((expense) => {
      const form = expenseResponseToForm(expense);
      return {
        id: expense.id,
        description: expense.description,
        notes: expense.notes ?? null,
        amount: expense.amount,
        paidByUserId: form.paidByUserId,
        payers: form.payers ?? [],
        splitType: expense.splitType,
        category: expense.category,
        subcategory: expense.subcategory,
        date: expense.date,
        participants: form.participants,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt ?? expense.createdAt,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function memberLookup(members: UserInterface[]) {
  const byId = new Map(members.map((member) => [member.id, member]));
  return (id: string): UserInterface => {
    const member = byId.get(id);
    if (!member) throw codedError("MEMBER_NOT_IN_GROUP", "A member of this expense is no longer in the group.");
    return member;
  };
}

function toExpenseResponse(
  record: LocalGroupRecord,
  data: ExpenseRequest,
  base: { id: string; createdAt: string; revision: number }
): ExpenseResponse {
  const member = memberLookup(record.group.members);
  const payers = (data.payers ?? []).map((payer) => ({ user: member(payer.userId), amount: payer.amount }));
  return {
    id: base.id,
    groupId: record.id,
    amount: data.amount,
    description: data.description,
    notes: data.notes ?? null,
    currency: record.group.currency,
    paidBy: payers.length ? null : data.paidByUserId ? member(data.paidByUserId) : null,
    payers,
    splitType: data.splitType,
    category: data.category,
    subcategory: data.subcategory,
    date: data.date,
    participants: data.participants.map((participant) => ({
      user: member(participant.userId),
      amount: participant.amount,
      percent: participant.percent,
    })),
    attachmentDataUrl: null,
    createdAt: base.createdAt,
    updatedAt: nowIso(),
    revision: base.revision,
  };
}

/**
 * Changes a local group in one IndexedDB transaction. Refused while it is
 * being sent (or the send's outcome is unknown), so what the server receives
 * is always the snapshot taken when sending started. Any change makes a
 * refused group a draft again, to be sent on the next attempt.
 */
async function mutateLocalGroup<T>(groupId: string, change: (record: LocalGroupRecord) => T): Promise<T> {
  const result = await withDb<{ value: T } | { error: unknown } | null>(null, (db) =>
    db.transaction("rw", db.localGroups, async () => {
      const record = await db.localGroups.get(groupId);
      if (!record) return { error: codedError("GROUP_NOT_FOUND", "Group not found") };
      if (!isLocalGroupEditable(record)) {
        return { error: codedError("LOCAL_GROUP_LOCKED", "This group is syncing. Try again in a moment.") };
      }
      try {
        const value = change(record);
        record.state = "draft";
        record.error = undefined;
        record.attempts = 0;
        record.nextAttemptAt = undefined;
        record.updatedAt = nowIso();
        await db.localGroups.put(record);
        return { value };
      } catch (error) {
        return { error };
      }
    })
  );
  if (!result) throw codedError("STORAGE_UNAVAILABLE", "This device can't save changes offline.");
  if ("error" in result) throw result.error;
  notifyChanged();
  return result.value;
}

export async function createLocalGroup(name: string, currency: string, memberNames: string[]): Promise<GroupResponse> {
  const validation = validateGroupInput(name, memberNames);
  if (!validation.success) throw codedError("INVALID_GROUP", validation.error);

  const createdAt = nowIso();
  const group: GroupResponse = {
    id: crypto.randomUUID(),
    name: validation.data.groupName,
    currency,
    createdAt,
    members: validation.data.memberNames.map((memberName) => ({ id: crypto.randomUUID(), name: memberName })),
  };
  const record: LocalGroupRecord = { id: group.id, state: "draft", group, expenses: [], createdAt, updatedAt: createdAt };

  const saved = await withDb(false, async (db) => {
    await db.localGroups.put(record);
    return true;
  });
  if (!saved) throw codedError("STORAGE_UNAVAILABLE", "This device can't save groups offline.");
  notifyChanged();
  return group;
}

export function addLocalExpense(groupId: string, data: ExpenseRequest) {
  return mutateLocalGroup(groupId, (record) => {
    const expense = toExpenseResponse(record, data, { id: crypto.randomUUID(), createdAt: nowIso(), revision: 1 });
    record.expenses.push(expense);
    return expense;
  });
}

export function updateLocalExpense(groupId: string, expenseId: string, data: ExpenseRequest) {
  return mutateLocalGroup(groupId, (record) => {
    const index = record.expenses.findIndex((expense) => expense.id === expenseId);
    if (index === -1) throw codedError("EXPENSE_DELETED", "Expense not found");
    const current = record.expenses[index];
    const next = toExpenseResponse(record, data, {
      id: current.id,
      createdAt: current.createdAt,
      revision: (current.revision ?? 1) + 1,
    });
    record.expenses[index] = next;
    return next;
  });
}

export function patchLocalExpenseCategory(groupId: string, expenseId: string, category: string, subcategory: string) {
  return mutateLocalGroup(groupId, (record) => {
    const expense = record.expenses.find((item) => item.id === expenseId);
    if (!expense) throw codedError("EXPENSE_DELETED", "Expense not found");
    expense.category = category as ExpenseResponse["category"];
    expense.subcategory = subcategory as ExpenseResponse["subcategory"];
    expense.updatedAt = nowIso();
    expense.revision = (expense.revision ?? 1) + 1;
    return {
      id: expense.id,
      groupId,
      category: expense.category,
      subcategory: expense.subcategory,
      updatedAt: expense.updatedAt,
      revision: expense.revision,
    };
  });
}

export function deleteLocalExpense(groupId: string, expenseId: string) {
  return mutateLocalGroup(groupId, (record) => {
    record.expenses = record.expenses.filter((expense) => expense.id !== expenseId);
    return true;
  });
}

function isMemberInvolved(expenses: ExpenseResponse[], memberId: string) {
  return expenses.some(
    (expense) =>
      expense.paidBy?.id === memberId ||
      expense.payers?.some((payer) => payer.user.id === memberId) ||
      expense.participants.some((participant) => participant.user.id === memberId)
  );
}

/** Same rules as the group update API: names validated, currency fixed, members in use kept. */
export function updateLocalGroup(groupId: string, data: GroupFormRequest) {
  return mutateLocalGroup(groupId, (record) => {
    const validation = validateGroupInput(data.name, data.members.map((member) => member.name));
    if (!validation.success) throw codedError("INVALID_GROUP", validation.error);
    if (data.currency !== record.group.currency) {
      throw codedError("GROUP_CURRENCY_LOCKED", "A group's currency can't be changed after it's created.");
    }

    const keptIds = new Set(data.members.flatMap((member) => (member.id ? [member.id] : [])));
    const removed = record.group.members.filter((member) => !keptIds.has(member.id));
    const blocked = removed.filter((member) => isMemberInvolved(record.expenses, member.id));
    if (blocked.length) {
      throw codedError(
        "MEMBER_IN_USE",
        blocked.length === 1
          ? `${blocked[0].name} is involved in an expense in this group and cannot be removed.`
          : `${blocked.map((member) => member.name).join(", ")} are involved in expenses in this group and cannot be removed.`
      );
    }

    const knownIds = new Set(record.group.members.map((member) => member.id));
    const members = data.members.map((member, index) => ({
      id: member.id && knownIds.has(member.id) ? member.id : crypto.randomUUID(),
      name: validation.data.memberNames[index],
    }));
    const names = new Map(members.map((member) => [member.id, member.name]));
    const rename = (user: UserInterface) => (names.has(user.id) ? { ...user, name: names.get(user.id)! } : user);

    record.group = { ...record.group, name: validation.data.groupName, members };
    record.expenses = record.expenses.map((expense) => ({
      ...expense,
      paidBy: expense.paidBy ? rename(expense.paidBy) : expense.paidBy,
      payers: expense.payers?.map((payer) => ({ ...payer, user: rename(payer.user) })),
      participants: expense.participants.map((participant) => ({ ...participant, user: rename(participant.user) })),
    }));
    return record.group;
  });
}

/** Discards a group that never reached the server. */
export async function deleteLocalGroup(groupId: string) {
  const result = await withDb<"deleted" | "locked" | "missing">("missing", (db) =>
    db.transaction("rw", db.localGroups, async () => {
      const record = await db.localGroups.get(groupId);
      if (!record) return "missing";
      if (!isLocalGroupEditable(record)) return "locked";
      await db.localGroups.delete(groupId);
      return "deleted";
    })
  );
  if (result === "locked") throw codedError("LOCAL_GROUP_LOCKED", "This group is syncing. Try again in a moment.");
  notifyChanged();
  return result === "deleted";
}
