import { EXPENSE_CATEGORIES, type CategoryKey, type SubcategoryId } from "@/components/icons/CategoryIcons";
import { supabase } from "@/integrations/supabase/client";

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
export interface GroupResponse {
  id: string;
  name: string;
  currency: string;
  members: UserInterface[];
  createdAt?: string;
}
export interface ExpenseResponse {
  id: string;
  groupId?: string;
  amount: number;
  description: string;
  currency: string;
  paidBy: UserInterface;
  splitType: SplitType;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: string;
  participants: ExpenseParticipantsResponse[];
  createdAt: string;
  updatedAt?: string;
}
export interface ExpenseRequest {
  amount: number;
  description: string;
  currency: string;
  paidByUserId: string;
  splitType: SplitType;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: string;
  participants: ExpenseParticipantsRequest[];
}
export interface ExpenseFormInterface {
  id: string;
  amount: number;
  description: string;
  currency: string;
  paidByUserId: string;
  splitType: SplitType;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: string;
  participants: ExpenseParticipantsRequest[];
  createdAt?: string;
  updatedAt?: string;
}
export interface GroupOverviewItemInterface {//landing page
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  expenses: { amount: number }[];
  members: string[];
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
  return fetch(`/api/groups/${groupId}`).then(r => r.json());
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

export async function loadGroupDetails(groupId: string) {
  return fetch(`/api/groups/${groupId}/dashboard`).then(r => r.json());
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
  const res = await fetch("/api/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      groupId,
      ...expenseData,
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

  return res.json();
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  data: ExpenseRequest
): Promise<ExpenseResponse | undefined> {
  const res = await fetch(`/api/expenses/${expenseId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      groupId,
      ...data,
    }),
  });

  if (!res.ok) {
    console.error("Failed to update expense");
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
