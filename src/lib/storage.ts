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
  participantUserId: string;//user id
  value: number|null;
  amount: number|null;
}

export interface Expense {
  id?: string;// UUID
  groupId: string;//->group.id
  description: string;
  amount: number;
  currency: string;
  paidByUserId: string;//->user.id
  splits: ExpenseSplit[];//jsonb in db
  splitType: SplitType;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: Date;
  createdBy?: string;//->user.id
  createdAt?: Date;
  updatedAt?: Date;
}

export interface User {
  id: string;// UUID
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  authProvider?: 'email' | 'google' | 'apple';
  isEmailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Group {
  id: string;// UUID
  name: string;
  currency: string;
  createdBy: string;//->user.id
  createdAt: Date;
  updatedAt?: Date;
}

export interface GroupMember {
  id: string;//uuid
  groupId: string;//->group.id
  userId: string;//->user.id
  role: 'admin' | 'member';
  nickname?: string;
  joinedAt: Date;
  isActive: boolean;
}
export interface ExpenseParticipants {
  expense_id: string//->expense.id
  id: string//uuid
  share_amount?: number | null
  share_percent?: number | null
  user_id: string//->user.id
}

export interface GroupOverviewItem {//landing page
  id: string;
  name: string;
  currency: string;
  created_at: string;
  expenses: { amount: number }[];
  members: string[];
}

export interface GroupDetail {//group view i.e; dashboard
  id: string;
  name: string;
  currency: string;
  created_at: string;
  expenses: {
    id: string;
    amount: number;
    description: string;
    currency: string;
    paidBy: User;
    splits: ExpenseSplit[];
    splitType: SplitType;
    category: CategoryKey;
    subcategory: SubcategoryId;
    date: Date;
    participants: User[];
  }[];
  members: User[];
}

export interface GroupWithMembers {//for add expense
  id: string;
  name: string;
  currency: string;
  members: User[];
}

export interface EditExpenseInput extends Expense {
  participantUserIds: string[];
}
export interface AddExpenseInput extends Expense {
  participantUserIds: string[];
}
// ========== GROUP OPERATIONS ==========

// Get a single group
export async function getGroup(groupId: string): Promise<GroupWithMembers | undefined> {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select(`
        id,
        name,
        currency,
        group_members (
          is_active,
          users (
            name,
            id
          )
        )
      `)
      .eq("id", groupId)
      .eq("group_members.is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return undefined;

    const members =
      data.group_members.map((m: any) => ({
        id: m.users.id,
        name: m.users.name,
      })) || [];

    return {
      id: data.id,
      name: data.name,
      currency: data.currency,
      members,
    };
  } catch (error) {
    console.error("Error getting group:", error);
    return undefined;
  }
}

// Create a new group ie; add group
export async function createGroup(
  name: string,
  currency: string,
  memberNames: string[]
): Promise<Group> {

  // ---------------------------------------------------------
  // Step 1: Create Users (Batch Insert)
  // ---------------------------------------------------------
  // We turn the array of names strings into an array of objects for the DB
  const userInserts = memberNames.map(memberName => ({
    name: memberName,
  }));

  // Insert them and IMMEDIATELY select to get their new UUIDs
  const { data: newUsers, error: userError } = await supabase
    .from('users')
    .insert(userInserts)
    .select('id, name'); // We only need ID and Name back

  if (userError) throw userError;
  if (!newUsers) throw new Error("Failed to create users");


  // ---------------------------------------------------------
  // Step 2: Create Group
  // ---------------------------------------------------------
  const { data: newGroup, error: groupError } = await supabase
    .from('groups')
    .insert({
      name,
      currency,
    })
    .select()
    .single();

  if (groupError) throw groupError;


  // ---------------------------------------------------------
  // Step 3: Link Users to Group (Create Members)
  // ---------------------------------------------------------
  // Now we have `newUsers` (with IDs) and `newGroup` (with ID).
  // We map them to the intersection table.
  const memberInserts = newUsers.map(user => ({
    group_id: newGroup.id,   // The group we just made
    user_id: user.id,        // The user we just made
    role: 'member',         // Default role since we have no logic yet
    joined_at: new Date().toISOString()
  }));

  const { error: memberError } = await supabase
    .from('group_members')
    .insert(memberInserts);

  if (memberError) {
    // Optional: If linking fails, you might want to delete the group to keep DB clean
    console.error("Failed to link members", memberError);
    throw memberError;
  }

  return {
    id: newGroup.id,
    name: newGroup.name,
    currency: newGroup.currency,
    createdBy: newGroup.created_by || "", // Handle null if DB allows it
    createdAt: new Date(newGroup.created_at),
  };
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

// Load groups by specific IDs for landing page recent groups data
export async function loadGroupsByIds(
  groupIds: string[]
): Promise<GroupOverviewItem[]> {
  if (groupIds.length === 0) return [];

  const { data, error } = await supabase
    .from("groups")
    .select(`
    id,
    name,
    currency,
    created_at,
    expenses (
      amount
    ),
    group_members!inner (
      is_active,
      user:users (
        id,
        name
      )
    )
  `)
    .in("id", groupIds)
    .eq("group_members.is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading groups by ids:", error);
    return [];
  }

  return (data || []).map((row) => ({
    ...row,
    members: row.group_members.map((gm) => gm.user.name),
  }));
}

export async function loadGroupDetails(//for group dashboard 
  groupId: string
): Promise<GroupDetail | null> {

  const { data, error } = await supabase
    .from("groups")
    .select(`
      id,
      name,
      currency,
      created_at,
      expenses (
        id,
        description,
        amount,
        currency,
        paidBy:users!expenses_paid_by_user_id_fkey (
          id,
          name
        ),
        split_type,
        category,
        subcategory,
        date,
        splits,
        expense_participants (
          user_id,
          user:users (
            id,
            name
          )
        )
      ),
      group_members!inner (
        is_active,
        user:users (
          id,
          name
        )
      )
    `)
    .eq("id", groupId)
    .eq("group_members.is_active", true)
    .single();

  if (error) {
    console.error("Error loading group details:", error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    currency: data.currency,
    created_at: data.created_at,

    expenses: (data.expenses || []).map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      currency: e.currency,
      paidBy: {
        id: e.paidBy.id,
        name: e.paidBy.name,
      },
      splits: parseSplits(e.splits) ?? [],

      splitType: e.split_type as SplitType,
      category: e.category as CategoryKey,
      subcategory: e.subcategory as SubcategoryId,
      date: new Date(e.date),

      participants: (e.expense_participants || []).map((p) => ({
        id: p.user.id,
        name: p.user.name,
      })),
    })),

    members: data.group_members.map((gm) => ({
      id: gm.user.id,
      name: gm.user.name,
    })),
  };
}

// ========== EXPENSE OPERATIONS ==========

// Get single expense edit expense
// Get single expense (new schema)
export async function getExpense(
  groupId: string,
  expenseId: string
): Promise<EditExpenseInput | undefined> {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        expense_participants (
          user_id
        )
      `)
      .eq("id", expenseId)
      .eq("group_id", groupId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return undefined;

    const participantUserIds =
      data.expense_participants?.map((p: any) => p.user_id) ?? [];

    return {
      id: data.id,
      groupId: data.group_id,
      description: data.description,
      amount: Number(data.amount),
      currency: data.currency,
      paidByUserId: data.paid_by_user_id,
      participantUserIds: participantUserIds,
      splits: parseSplits(data.splits),
      splitType: data.split_type as SplitType,
      category: data.category as CategoryKey,
      subcategory: data.subcategory as SubcategoryId,
      date: new Date(data.date),
      createdBy: data.created_by ?? undefined,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    };
  } catch (error) {
    console.error("Error getting expense:", error);
    return undefined;
  }
}

// Add expense to a group
export async function addExpense(
  groupId: string,
  data: AddExpenseInput
): Promise<Expense | undefined> {
  try {

    // 1. Insert expense
    const { data: expenseRow, error: expenseError } = await supabase
      .from("expenses")
      .insert([
        {
          group_id: groupId,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          paid_by_user_id: data.paidByUserId,
          splits: data.splits as unknown as Json,
          split_type: data.splitType,
          category: data.category,
          subcategory: data.subcategory,
          date: new Date().toISOString().split("T")[0],
          created_by: data.createdBy ?? null,
        },
      ])
      .select()
      .single();

    if (expenseError) throw expenseError;

    // 2. Insert participants from participantUserIds
    if (data.participantUserIds?.length) {
      const participantsPayload = data.participantUserIds.map((userId) => ({
        expense_id: expenseRow.id,
        user_id: userId,
      }));

      const { error: participantsError } = await supabase
        .from("expense_participants")
        .insert(participantsPayload);

      if (participantsError) throw participantsError;
    }

    // 3. Return domain Expense
    return {
      id: expenseRow.id,
      groupId: expenseRow.group_id,
      description: expenseRow.description,
      amount: Number(expenseRow.amount),
      currency: expenseRow.currency,
      paidByUserId: expenseRow.paid_by_user_id,
      splits: parseSplits(expenseRow.splits),
      splitType: expenseRow.split_type as SplitType,
      category: expenseRow.category as CategoryKey,
      subcategory: expenseRow.subcategory as SubcategoryId,
      date: new Date(expenseRow.date),
      createdBy: expenseRow.created_by ?? undefined,
      createdAt: expenseRow.created_at
        ? new Date(expenseRow.created_at)
        : undefined,
      updatedAt: expenseRow.updated_at
        ? new Date(expenseRow.updated_at)
        : undefined,
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
  data: AddExpenseInput
): Promise<Expense | undefined> {
  try {
    // 1. Update expense row
    const { data: expenseRow, error: expenseError } = await supabase
      .from("expenses")
      .update({
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        paid_by_user_id: data.paidByUserId,
        splits: data.splits as unknown as Json,
        split_type: data.splitType,
        category: data.category,
        subcategory: data.subcategory,
        date: data.date
          ? new Date(data.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", expenseId)
      .eq("group_id", groupId)
      .select()
      .single();

    if (expenseError) throw expenseError;

    // 2. Delete existing participants
    const { error: deleteError } = await supabase
      .from("expense_participants")
      .delete()
      .eq("expense_id", expenseId);

    if (deleteError) throw deleteError;

    // 3. Insert updated participants
    if (data.participantUserIds?.length) {
      const participantsPayload = data.participantUserIds.map((userId) => ({
        expense_id: expenseId,
        user_id: userId,
      }));

      const { error: insertError } = await supabase
        .from("expense_participants")
        .insert(participantsPayload);

      if (insertError) throw insertError;
    }

    // 4. Return domain object
    return {
      id: expenseRow.id,
      groupId: expenseRow.group_id,
      description: expenseRow.description,
      amount: Number(expenseRow.amount),
      currency: expenseRow.currency,
      paidByUserId: expenseRow.paid_by_user_id,
      splits: parseSplits(expenseRow.splits),
      splitType: expenseRow.split_type as SplitType,
      category: expenseRow.category as CategoryKey,
      subcategory: expenseRow.subcategory as SubcategoryId,
      date: new Date(expenseRow.date),
      createdBy: expenseRow.created_by ?? undefined,
      createdAt: expenseRow.created_at
        ? new Date(expenseRow.created_at)
        : undefined,
      updatedAt: expenseRow.updated_at
        ? new Date(expenseRow.updated_at)
        : undefined,
    };
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
