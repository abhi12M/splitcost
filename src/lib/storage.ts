import { EXPENSE_CATEGORIES, type CategoryKey, type SubcategoryId } from "@/components/icons/CategoryIcons";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type SplitType = "equal" | "percentage" | "custom";


// Helper to safely parse splits from database
function parseSplits(data: Json | undefined | null): ExpenseSplit[] {
  if (!data) return [];
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as ExpenseSplit[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(data)) {
    return data as unknown as ExpenseSplit[];
  }
  return [];
}

export interface ExpenseSplit {
  member: string;
  value: number | "";
  amount: number | "";
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  participants: string[];
  splits: ExpenseSplit[];
  splitType: SplitType;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: string;
  createdAt: Date;
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  currency: string;
  createdAt: string;
}

// ========== GROUP OPERATIONS ==========

// Load all groups
export async function loadGroups(): Promise<Group[]> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      members: row.members || [],
      currency: row.currency,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("Error loading groups:", error);
    return [];
  }
}

// Get a single group
export async function getGroup(groupId: string): Promise<Group | undefined> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return undefined;

    return {
      id: data.id,
      name: data.name,
      members: data.members || [],
      currency: data.currency,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error("Error getting group:", error);
    return undefined;
  }
}

// Create a new group
export async function createGroup(name: string, currency: string, members: string[]): Promise<Group> {
  const { data, error } = await supabase
    .from("groups")
    .insert({
      name,
      members,
      currency,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    members: data.members || [],
    currency: data.currency,
    createdAt: data.created_at,
  };
}

// Update a group
export async function updateGroup(groupId: string, updates: Partial<Omit<Group, "id">>): Promise<Group | undefined> {
  try {
    const supabaseUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) supabaseUpdates.name = updates.name;
    if (updates.members !== undefined) supabaseUpdates.members = updates.members;
    if (updates.currency !== undefined) supabaseUpdates.currency = updates.currency;

    const { error } = await supabase
      .from("groups")
      .update(supabaseUpdates)
      .eq("id", groupId);

    if (error) throw error;

    return getGroup(groupId);
  } catch (error) {
    console.error("Error updating group:", error);
    return undefined;
  }
}

// Delete a group (expenses will be cascade deleted)
export async function deleteGroup(groupId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting group:", error);
    return false;
  }
}

// Load groups by specific IDs
export async function loadGroupsByIds(groupIds: string[]): Promise<Group[]> {
  if (groupIds.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .in("id", groupIds)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      members: row.members || [],
      currency: row.currency,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error("Error loading groups by ids:", error);
    return [];
  }
}

// ========== EXPENSE OPERATIONS ==========

// Load all expenses for a group
export async function loadExpenses(groupId: string): Promise<Expense[]> {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row) => ({
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      amount: Number(row.amount),
      currency: row.currency,
      paidBy: row.paid_by,
      participants: row.participants || [],
      splits: parseSplits(row.splits),
      splitType: row.split_type as SplitType,
      category: row.category as CategoryKey,
      subcategory: row.subcategory as SubcategoryId,
      date: row.date,
      createdAt: new Date(row.created_at),
    }));
  } catch (error) {
    console.error("Error loading expenses:", error);
    return [];
  }
}

// Get single expense
export async function getExpense(groupId: string, expenseId: string): Promise<Expense | undefined> {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", expenseId)
      .eq("group_id", groupId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return undefined;

    return {
      id: data.id,
      groupId: data.group_id,
      description: data.description,
      amount: Number(data.amount),
      currency: data.currency,
      paidBy: data.paid_by,
      participants: data.participants || [],
      splits: parseSplits(data.splits),
      splitType: data.split_type as SplitType,
      category: data.category as CategoryKey,
      subcategory: data.subcategory as SubcategoryId,
      date: data.date,
      createdAt: new Date(data.created_at),
    };
  } catch (error) {
    console.error("Error getting expense:", error);
    return undefined;
  }
}

// Add expense to a group
export async function addExpense(
  groupId: string,
  expense: Omit<Expense, "id" | "groupId" | "date" | "createdAt">
): Promise<Expense | undefined> {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .insert([{
        group_id: groupId,
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        paid_by: expense.paidBy,
        participants: expense.participants,
        splits: JSON.stringify(expense.splits),
        split_type: expense.splitType,
        category: expense.category,
        subcategory: expense.subcategory,
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      groupId: data.group_id,
      description: data.description,
      amount: Number(data.amount),
      currency: data.currency,
      paidBy: data.paid_by,
      participants: data.participants || [],
      splits: parseSplits(data.splits),
      splitType: data.split_type as SplitType,
      category: data.category as CategoryKey,
      subcategory: data.subcategory as SubcategoryId,
      date: data.date,
      createdAt: new Date(data.created_at),
    };
  } catch (error) {
    console.error("Error adding expense:", error);
    return undefined;
  }
}

// Update expense
export async function updateExpense(
  groupId: string,
  expenseId: string,
  updates: Partial<Omit<Expense, "id" | "groupId">>
): Promise<Expense | undefined> {
  try {
    const supabaseUpdates: Record<string, unknown> = {};
    if (updates.description !== undefined) supabaseUpdates.description = updates.description;
    if (updates.amount !== undefined) supabaseUpdates.amount = updates.amount;
    if (updates.currency !== undefined) supabaseUpdates.currency = updates.currency;
    if (updates.paidBy !== undefined) supabaseUpdates.paid_by = updates.paidBy;
    if (updates.participants !== undefined) supabaseUpdates.participants = updates.participants;
    if (updates.splits !== undefined) supabaseUpdates.splits = JSON.stringify(updates.splits);
    if (updates.splitType !== undefined) supabaseUpdates.split_type = updates.splitType;
    if (updates.category !== undefined) supabaseUpdates.category = updates.category;
    if (updates.subcategory !== undefined) supabaseUpdates.subcategory = updates.subcategory;
    if (updates.date !== undefined) supabaseUpdates.date = updates.date;

    const { error } = await supabase
      .from("expenses")
      .update(supabaseUpdates)
      .eq("id", expenseId)
      .eq("group_id", groupId);

    if (error) throw error;

    return getExpense(groupId, expenseId);
  } catch (error) {
    console.error("Error updating expense:", error);
    return undefined;
  }
}

// Delete expense
export async function deleteExpense(groupId: string, expenseId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseId)
      .eq("group_id", groupId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting expense:", error);
    return false;
  }
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
