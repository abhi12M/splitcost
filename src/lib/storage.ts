import { EXPENSE_CATEGORIES, type CategoryKey, type SubcategoryId } from "@/components/icons/CategoryIcons";
import type { ExpenseAttachment } from "@/lib/expenseAttachments";
import { getRealtimeOriginSessionId } from "@/lib/realtime/originSession";
import {
  deleteCachedExpense,
  deleteCachedGroup,
  patchCachedExpenseCategory,
  patchCachedGroup,
  readCachedGroupSummaries,
  upsertCachedDashboardExpense,
  writeCachedGroupSummaries,
} from "@/lib/offline/cache";
import {
  addLocalExpense,
  createLocalGroup,
  deleteLocalExpense,
  deleteLocalGroup,
  findLocalExpense,
  getLocalGroup,
  listLocalGroups,
  localDashboard,
  localExpenseDetails,
  localGroupSummary,
  patchLocalExpenseCategory,
  updateLocalExpense,
  updateLocalGroup,
} from "@/lib/offline/localGroups";
import { isOfflineError, isOnline, trackedFetch } from "@/lib/offline/network";
import { forgetFailedAdd, rememberFailedAdd, requestIdForAdd } from "@/lib/offline/lostAdd";

// Every call below first checks whether the group was created on this device
// and hasn't reached the server yet (see lib/offline/localGroups); such a
// group is read and changed in IndexedDB only, until it is synced.

export type SplitType = "equal" | "percentage" | "custom";

export interface ExpenseParticipantsRequest {
  userId: string;
  amount: number | null;
  percent: number | null;//value when splittype percent
}
export interface ExpenseParticipantsResponse {
  user: UserInterface;
  amount: number | null;
  percent: number | null;//value when splittype percent
}
export interface ExpensePayerRequest {
  userId: string;
  amount: number;
}
export interface ExpensePayerResponse {
  user: UserInterface;
  amount: number;
}
export interface GroupResponse {
  id: string;
  name: string;
  currency: string;
  members: UserInterface[];
  createdAt?: string;
  /** Present where an editor needs it (dashboard payload, group update). */
  revision?: number;
}
export interface GroupFormMember {
  id?: string;
  name: string;
}
export interface GroupFormRequest {
  name: string;
  currency: string;
  members: GroupFormMember[];
  /** Revision the edit started from; a newer one on the server is a conflict. */
  revision?: number;
}
export interface MemberRemovalCheckResponse {
  canRemove: boolean;
  message?: string;
}

/** Client-side removal check using dashboard expenses (no extra API call). */
export function canRemoveGroupMember(
  expenses: ExpenseResponse[],
  member: Pick<GroupFormMember, "id" | "name">
): MemberRemovalCheckResponse {
  if (!member.id) {
    return {
      canRemove: true,
      message: "This new member has not been saved yet and can be removed right away.",
    };
  }

  const memberId = member.id;
  const isInvolved = expenses.some((expense) => {
    if (expense.paidBy?.id === memberId) return true;
    if (expense.payers?.some((payer) => payer.user.id === memberId)) return true;
    return expense.participants.some((participant) => participant.user.id === memberId);
  });

  if (isInvolved) {
    return {
      canRemove: false,
      message: `${member.name} is involved in an expense in this group and cannot be removed.`,
    };
  }

  return {
    canRemove: true,
    message: "This member can be removed from the group.",
  };
}
export interface ExpenseResponse {
  id: string;
  groupId?: string;
  amount: number;
  description: string;
  notes?: string | null;
  currency: string;
  paidBy: UserInterface | null;
  payers?: ExpensePayerResponse[];
  splitType: SplitType;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: string;
  participants: ExpenseParticipantsResponse[];
  attachmentDataUrl?: string | null;
  /** Present on expenses from `load_group_details` dashboard RPC. */
  attachment_data_url?: string | null;
  createdAt: string;
  updatedAt?: string;
  revision?: number;
}
export interface ExpenseRequest {
  /** Required for edits; omitted for new expenses. */
  revision?: number;
  amount: number;
  description: string;
  notes?: string | null;
  currency: string;
  paidByUserId: string | null;
  payers?: ExpensePayerRequest[];
  splitType: SplitType;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: string;
  participants: ExpenseParticipantsRequest[];
  attachment?: ExpenseAttachment | null;
}
export interface ExpenseFormInterface {
  id: string;
  amount: number;
  description: string;
  notes?: string | null;
  currency: string;
  paidByUserId: string | null;
  payers?: ExpensePayerRequest[];
  splitType: SplitType;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: string;
  participants: ExpenseParticipantsRequest[];
  attachmentDataUrl?: string | null;
  // Inline attachment payload returned by GET /api/expenses/:id so callers
  // don't need a second round-trip to /api/expenses/:id/attachment.
  attachment?: ExpenseAttachment | null;
  createdAt?: string;
  updatedAt?: string;
  revision?: number;
}
export interface ExpenseCategoryPatchResponse {
  id: string;
  groupId?: string;
  category: CategoryKey;
  subcategory: SubcategoryId;
  updatedAt?: string;
  revision?: number;
}
export interface GroupOverviewItemInterface {//landing page
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  updatedAt?: string | null;
  expenses?: {
    amount: number;
    createdAt?: string | null;
    updatedAt?: string | null;
  }[];
  members: string[];
  memberCount?: number;
  expenseCount?: number;
  totalExpenses?: number;
  latestExpenseActivityAt?: string | null;
}
export interface UserInterface {
  id: string;
  name: string;
}
export interface GroupDashboardInterface {
  group: GroupResponse;
  expenses: ExpenseResponse[];
}
export interface EditExpenseInterface {
  group: GroupResponse;
  expense: ExpenseFormInterface;
}
// ========== GROUP OPERATIONS ==========
// Get a single group for add expense page
export async function getGroup(groupId: string): Promise<GroupResponse | null> {
  const local = await getLocalGroup(groupId);
  if (local) return local.group;

  const res = await trackedFetch(`/api/groups/${groupId}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const group = (await res.json()) as GroupResponse | null;
  if (group) void patchCachedGroup(group);
  return group;
}

/**
 * Creates the group on the server, or, while offline, on this device only
 * (`local: true`); a local group is sent to the server once back online.
 */
export async function createGroup(
  name: string,
  currency: string,
  memberNames: string[]
): Promise<(GroupResponse & { local?: boolean }) | undefined> {
  if (!isOnline()) {
    return { ...(await createLocalGroup(name, currency, memberNames)), local: true };
  }

  let res: Response;
  try {
    res = await trackedFetch("/api/groups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        currency,
        memberNames,
      }),
    });
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    // The connection dropped: keep the group on this device instead.
    return { ...(await createLocalGroup(name, currency, memberNames)), local: true };
  }

  if (!res.ok) {
    console.error("Failed to create group");
    return undefined;
  }

  return res.json();
}

export async function updateGroup(
  groupId: string,
  data: GroupFormRequest
): Promise<GroupResponse> {
  if (await getLocalGroup(groupId)) return updateLocalGroup(groupId, data);

  const res = await trackedFetch(`/api/groups/${groupId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: data.name,
      currency: data.currency,
      members: data.members,
      expectedRevision: data.revision,
      originSessionId: getRealtimeOriginSessionId(),
    }),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    // `code` lets the editor tell a version conflict apart from other failures.
    const error = new Error(payload?.error || "Failed to update group") as Error & { code?: string; payload?: unknown };
    error.code = payload?.code;
    error.payload = payload;
    throw error;
  }

  // Save the new name and members before the caller goes back to the dashboard
  // and the My groups list, so they open with them already.
  const group = withoutMessage(payload) as GroupResponse;
  await patchCachedGroup(group);
  return group;
}

export async function loadGroupDetails(groupId: string): Promise<GroupDashboardInterface | null> {
  const local = await getLocalGroup(groupId);
  if (local) return localDashboard(local);

  const res = await trackedFetch(`/api/groups/${groupId}/dashboard`, {
    method: "GET",
    cache: "no-store",
  })

  if (!res.ok) {
    return null
  }

  return res.json()
}


export async function loadGroupsByIds(
  groupIds: string[]
): Promise<GroupOverviewItemInterface[]> {
  return (await loadMyGroups(groupIds)).groups;
}

/**
 * The cards for "My groups": local groups from this device, synced ones from
 * the server, or from the last saved copy while offline. `fromServer` says
 * whether the server answered, i.e. whether a missing group is really gone.
 */
export async function loadMyGroups(
  groupIds: string[]
): Promise<{ groups: GroupOverviewItemInterface[]; fromServer: boolean }> {
  const localGroups = await listLocalGroups();
  const localIds = new Set(localGroups.map((record) => record.id));
  const local = localGroups.filter((record) => groupIds.includes(record.id)).map(localGroupSummary);
  const serverIds = groupIds.filter((id) => !localIds.has(id));
  if (serverIds.length === 0) return { groups: local, fromServer: true };

  try {
    const res = await trackedFetch("/api/groups/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ groupIds: serverIds }),
    });

    if (!res.ok) {
      console.error("Failed to load groups");
      return { groups: [...local, ...(await readCachedGroupSummaries(serverIds))], fromServer: false };
    }

    const groups = (await res.json()) as GroupOverviewItemInterface[];
    void writeCachedGroupSummaries(groups);
    return { groups: [...local, ...groups], fromServer: true };
  } catch (error) {
    if (!isOfflineError(error)) throw error;
    return { groups: [...local, ...(await readCachedGroupSummaries(serverIds))], fromServer: false };
  }
}

/**
 * "My groups" from this device only: local groups plus the last saved copy of
 * the synced ones. Null unless every group has a saved copy, so the list never
 * appears partly filled before the server answers.
 */
export async function loadCachedMyGroups(groupIds: string[]): Promise<GroupOverviewItemInterface[] | null> {
  const localGroups = await listLocalGroups();
  const localIds = new Set(localGroups.map((record) => record.id));
  const local = localGroups.filter((record) => groupIds.includes(record.id)).map(localGroupSummary);
  const serverIds = groupIds.filter((id) => !localIds.has(id));
  const cached = await readCachedGroupSummaries(serverIds);
  if (cached.length < serverIds.length) return null;
  return [...local, ...cached];
}

/**
 * True when the server no longer has this group. Used to tell "this expense
 * was deleted" apart from "its whole group was deleted" (which also deletes
 * every expense in it).
 */
export async function isGroupDeleted(groupId: string): Promise<boolean> {
  if (await getLocalGroup(groupId)) return false;
  const res = await trackedFetch(`/api/groups/${groupId}`, { cache: "no-store" }).catch(() => null);
  if (res?.status === 404) void deleteCachedGroup(groupId);
  return res?.status === 404;
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  if (await getLocalGroup(groupId)) return deleteLocalGroup(groupId);

  const res = await trackedFetch(`/api/groups/${groupId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    // Lets this tab ignore its own "group deleted" broadcast.
    body: JSON.stringify({ originSessionId: getRealtimeOriginSessionId() }),
  });

  if (!res.ok) {
    console.error("Failed to delete group");
    return false;
  }

  void deleteCachedGroup(groupId);
  return true;
}

export async function addExpense(
  groupId: string,
  expenseData: ExpenseRequest
): Promise<ExpenseResponse | undefined> {
  if (await getLocalGroup(groupId)) return addLocalExpense(groupId, expenseData);

  const { attachment: _attachment, ...expensePayload } = expenseData;
  // An earlier try at this same expense may have reached the server although
  // its answer was lost; sending its request id again makes the server return
  // that expense instead of adding it twice.
  const requestId = requestIdForAdd(groupId, expenseData);

  let res: Response;
  try {
    res = await trackedFetch("/api/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupId,
        originSessionId: getRealtimeOriginSessionId(),
        requestId,
        ...expensePayload,
      }),
    });
  } catch (error) {
    // No answer at all: it may or may not have been saved. Keep its id for a retry.
    if (isOfflineError(error)) rememberFailedAdd(groupId, expenseData, requestId);
    throw error;
  }
  // A server error may come after the expense was saved (e.g. a timeout in
  // front of it), so keep the id for a retry then too; any other answer is final.
  if (res.status >= 500) rememberFailedAdd(groupId, expenseData, requestId);
  else forgetFailedAdd();

  // Throw rather than return nothing, so callers can't mistake a failed save
  // for a successful one.
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    // `code` lets callers tell e.g. GROUP_NOT_FOUND apart from other failures.
    const error = new Error(payload?.error || "Failed to add expense") as Error & { code?: string; status?: number };
    error.code = payload?.code;
    error.status = res.status;
    throw error;
  }

  const created = withoutMessage(await res.json()) as ExpenseResponse;
  // Save it into the cached dashboard before the caller goes there, so the
  // dashboard opens with the new expense already in its list.
  await upsertCachedDashboardExpense(groupId, created);
  return created;
}


export async function editExpense(
  expenseId: string
): Promise<EditExpenseInterface | null> {
  const local = await findLocalExpense(expenseId);
  if (local) return localExpenseDetails(local.record, local.expense);

  const res = await trackedFetch(`/api/expenses/${expenseId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Failed to load expense for edit");
    return null;
  }

  return (await res.json()) as EditExpenseInterface;
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  data: ExpenseRequest
): Promise<ExpenseResponse | undefined> {
  // `revision` is sent as `expectedRevision` below; drop it here so it isn't
  // also duplicated into the payload by the spread.
  if (await getLocalGroup(groupId)) return updateLocalExpense(groupId, expenseId, data);

  const { attachment: _attachment, revision: _revision, ...expensePayload } = data;

  const res = await trackedFetch(`/api/expenses/${expenseId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      groupId,
      expectedRevision: data.revision,
      originSessionId: getRealtimeOriginSessionId(),
      ...expensePayload,
    }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const error = new Error(payload?.code || "Failed to update expense") as Error & { code?: string; payload?: unknown; status?: number };
    error.code = payload?.code;
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  const updated = withoutMessage(await res.json()) as ExpenseResponse;
  // Replace it in the cached dashboard before the caller goes there.
  await upsertCachedDashboardExpense(groupId, updated);
  return updated;
}

/** An API reply without its human-readable `message`. */
function withoutMessage(body: unknown) {
  if (!body || typeof body !== "object") return body;
  const { message: _message, ...rest } = body as Record<string, unknown>;
  return rest;
}

export async function patchExpenseCategory(
  expenseId: string,
  category: CategoryKey,
  subcategory: SubcategoryId,
  /** The category the user saw; the server rejects the change if it has since moved on. */
  expected: { category: string; subcategory: string }
): Promise<ExpenseCategoryPatchResponse | undefined> {
  const local = await findLocalExpense(expenseId);
  if (local) return patchLocalExpenseCategory(local.record.id, expenseId, category, subcategory);

  const res = await trackedFetch(`/api/expenses/${expenseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category,
      subcategory,
      expectedCategory: expected.category,
      expectedSubcategory: expected.subcategory,
      originSessionId: getRealtimeOriginSessionId(),
    }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const error = new Error(payload?.error || "Failed to update expense category") as Error & {
      code?: string;
      details?: string;
      payload?: unknown;
    };
    error.code = payload?.code;
    error.details = payload?.details;
    error.payload = payload;
    throw error;
  }

  const changed = withoutMessage(await res.json()) as ExpenseCategoryPatchResponse;
  // Show the new category in the saved dashboard and the expense's saved copy too.
  await patchCachedExpenseCategory(changed);
  return changed;
}

export async function deleteExpense(
  expenseId: string
): Promise<boolean> {
  const local = await findLocalExpense(expenseId);
  if (local) return deleteLocalExpense(local.record.id, expenseId);

  const res = await trackedFetch(`/api/expenses/${expenseId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ originSessionId: getRealtimeOriginSessionId() }),
  });

  if (!res.ok) {
    console.error("Failed to delete expense");
    return false;
  }

  // Wait, so the dashboard the caller goes to next no longer lists it.
  await deleteCachedExpense(expenseId);
  return true;
}

// ========== UTILITY FUNCTIONS ==========

// Auto-detect category from description
export function detectCategoryFromDescription(
  description: string
): { category: CategoryKey; subcategory: SubcategoryId } {
  const text = description.toLowerCase().trim();

  let bestMatch: {
    category: CategoryKey;
    subcategory: SubcategoryId;
    score: number;
  } | null = null;

  for (const [categoryKey, category] of Object.entries(EXPENSE_CATEGORIES)) {
    const categoryLabel = category.label.toLowerCase();

    for (const sub of category.subcategories) {
      let score = 0;

      // 1️⃣ Match subcategory keywords
      if (sub.keywords?.length) {
        for (const keyword of sub.keywords) {
          const k = keyword.toLowerCase();
          const regex = new RegExp(`\\b${k}\\b`, "i");

          if (regex.test(text) || text.includes(k)) {
            score += 3; // highest priority
          }
        }
      }

      // 2️⃣ Match subcategory label
      const subLabel = sub.label.toLowerCase();
      if (text.includes(subLabel)) {
        score += 2;
      }

      // 3️⃣ Match category label
      if (text.includes(categoryLabel)) {
        score += 1;
      }

      // 4️⃣ Pick best scoring match
      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          category: categoryKey as CategoryKey,
          subcategory: sub.id,
          score,
        };
      }
    }
  }

  return (
    bestMatch ?? {
      category: "uncategorized",
      subcategory: "general",
    }
  );

}
