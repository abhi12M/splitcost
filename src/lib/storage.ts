import { EXPENSE_CATEGORIES, type CategoryKey, type SubcategoryId } from "@/components/icons/CategoryIcons";
import type { ExpenseAttachment } from "@/lib/expenseAttachments";
import { clearCachedExpense, saveCachedExpense } from "@/lib/expenseCache";

export type SplitType = "equal" | "percentage" | "custom";

// export interface Expense {
//   id: string;// UUID
//   groupId: string;//->group.id
//   description: string;
//   amount: number;
//   currency: string;
//   paidByUserId: string;//->user.id
//   splitType: SplitType;
//   category: CategoryKey;
//   subcategory: SubcategoryId;
//   date: Date;
//   createdBy?: string;//->user.id
//   createdAt: Date;
//   updatedAt?: Date;
// }

// export interface User {
//   id: string;// UUID
//   name: string;
//   email?: string;
//   phone?: string;
//   avatarUrl?: string;
//   authProvider?: 'email' | 'google' | 'apple';
//   isEmailVerified?: boolean;
//   createdAt: Date;
//   updatedAt?: Date;
// }


// export interface Group {
//   id: string;// UUID
//   name: string;
//   currency: string;
//   createdBy: string;//->user.id
//   createdAt: Date;
//   updatedAt?: Date;
// }

// export interface GroupMember {
//   id: string;//uuid
//   groupId: string;//->group.id
//   userId: string;//->user.id
//   role: 'admin' | 'member';
//   nickname?: string;
//   joinedAt: Date;
//   isActive: boolean;
// }
// export interface ExpenseParticipants {
//   id: string//uuid
//   expense_id: string//->expense.id
//   share_amount: number | null
//   share_percent?: number | null
//   user_id: string//->user.id
// }
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
}
export interface GroupFormMember {
  id?: string;
  name: string;
}
export interface GroupFormRequest {
  name: string;
  currency: string;
  members: GroupFormMember[];
}
export interface MemberRemovalCheckResponse {
  canRemove: boolean;
  message?: string;
}
export interface ExpenseResponse {
  id: string;
  groupId?: string;
  amount: number;
  description: string;
  currency: string;
  paidBy: UserInterface | null;
  payers?: ExpensePayerResponse[];
  splitType: SplitType;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: string;
  participants: ExpenseParticipantsResponse[];
  attachmentDataUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}
export interface ExpenseRequest {
  amount: number;
  description: string;
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
    }),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error || "Failed to update group");
  }

  return payload;
}

export async function checkGroupMemberRemoval(
  groupId: string,
  member: GroupFormMember
): Promise<MemberRemovalCheckResponse> {
  const res = await fetch(`/api/groups/${groupId}/members/check-removal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      memberId: member.id,
      memberName: member.name,
    }),
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(payload?.error || "Failed to validate member removal");
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

export async function deleteGroup(groupId: string): Promise<boolean> {
  const res = await fetch(`/api/groups/${groupId}`, {
    method: "DELETE",
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
      ...expensePayload,
    }),
  });

  if (!res.ok) {
    console.error("Failed to add expense");
    return undefined;
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

  const payload = (await res.json()) as EditExpenseInterface;
  // Cache so a subsequent navigation (view -> edit, or vice versa) can render
  // instantly while a fresh fetch revalidates in the background.
  saveCachedExpense(expenseId, payload);
  return payload;
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  data: ExpenseRequest
): Promise<ExpenseResponse | undefined> {
  const { attachment: _attachment, ...expensePayload } = data;

  const res = await fetch(`/api/expenses/${expenseId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      groupId,
      ...expensePayload,
    }),
  });

  if (!res.ok) {
    console.error("Failed to update expense");
    return undefined;
  }

  // Cached read may now be stale (description / amount / split changed).
  clearCachedExpense(expenseId);
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
    }),
  });

  if (!res.ok) {
    console.error("Failed to patch expense category");
    return undefined;
  }

  return res.json();
}

export async function deleteExpense(
  expenseId: string
): Promise<boolean> {
  const res = await fetch(`/api/expenses/${expenseId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    console.error("Failed to delete expense");
    return false;
  }

  clearCachedExpense(expenseId);
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
