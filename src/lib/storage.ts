import { EXPENSE_CATEGORIES, type CategoryKey, type SubcategoryId } from "@/components/icons/CategoryIcons";
import type { ExpenseAttachment } from "@/lib/expenseAttachments";
import { getRealtimeOriginSessionId } from "@/lib/realtime/originSession";

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
export async function getGroup(groupId: string) {
  return fetch(`/api/groups/${groupId}`, {
    cache: "no-store",
  }).then(r => r.json());
}

export async function createGroup(
  name: string,
  currency: string,
  memberNames: string[]
): Promise<GroupResponse | undefined> {
  const res = await fetch("/api/groups", {
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
  const res = await fetch(`/api/groups/${groupId}`, {
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

  return payload;
}

export async function loadGroupDetails(groupId: string) {
  const res = await fetch(`/api/groups/${groupId}/dashboard`, {
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
  if (groupIds.length === 0) return [];

  const res = await fetch("/api/groups/batch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ groupIds }),
  });

  if (!res.ok) {
    console.error("Failed to load groups");
    return [];
  }

  return res.json();
}

/**
 * True when the server no longer has this group. Used to tell "this expense
 * was deleted" apart from "its whole group was deleted" (which also deletes
 * every expense in it).
 */
export async function isGroupDeleted(groupId: string): Promise<boolean> {
  const res = await fetch(`/api/groups/${groupId}`, { cache: "no-store" }).catch(() => null);
  return res?.status === 404;
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  const res = await fetch(`/api/groups/${groupId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    // Lets this tab ignore its own "group deleted" broadcast.
    body: JSON.stringify({ originSessionId: getRealtimeOriginSessionId() }),
  });

  if (!res.ok) {
    console.error("Failed to delete group");
    return false;
  }

  return true;
}

export async function addExpense(
  groupId: string,
  expenseData: ExpenseRequest
): Promise<ExpenseResponse | undefined> {
  const { attachment: _attachment, ...expensePayload } = expenseData;

  const res = await fetch("/api/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      groupId,
      originSessionId: getRealtimeOriginSessionId(),
      ...expensePayload,
    }),
  });

  // Throw rather than return nothing, so callers can't mistake a failed save
  // for a successful one.
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    // `code` lets callers tell e.g. GROUP_NOT_FOUND apart from other failures.
    const error = new Error(payload?.error || "Failed to add expense") as Error & { code?: string };
    error.code = payload?.code;
    throw error;
  }

  return res.json();
}


export async function editExpense(
  expenseId: string
): Promise<EditExpenseInterface | null> {
  const res = await fetch(`/api/expenses/${expenseId}`, {
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
  const { attachment: _attachment, revision: _revision, ...expensePayload } = data;

  const res = await fetch(`/api/expenses/${expenseId}`, {
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
    const error = new Error(payload?.code || "Failed to update expense") as Error & { code?: string; payload?: unknown };
    error.code = payload?.code;
    error.payload = payload;
    throw error;
  }

  // Cached read may now be stale (description / amount / split changed).
  return res.json();
}

export async function patchExpenseCategory(
  expenseId: string,
  category: CategoryKey,
  subcategory: SubcategoryId
): Promise<ExpenseCategoryPatchResponse | undefined> {
  const res = await fetch(`/api/expenses/${expenseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category,
      subcategory,
      originSessionId: getRealtimeOriginSessionId(),
    }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const error = new Error(payload?.error || "Failed to update expense category") as Error & {
      code?: string;
      details?: string;
    };
    error.code = payload?.code;
    error.details = payload?.details;
    throw error;
  }

  return res.json();
}

export async function deleteExpense(
  expenseId: string
): Promise<boolean> {
  const res = await fetch(`/api/expenses/${expenseId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ originSessionId: getRealtimeOriginSessionId() }),
  });

  if (!res.ok) {
    console.error("Failed to delete expense");
    return false;
  }

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
