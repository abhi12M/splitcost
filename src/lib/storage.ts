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

export interface ExpenseParticipants {
  user: User
  amount: number | null
  percent?: number | null
}

export interface User {
  id: string;
  name?: string;//optional for paidby and participant in expenseform
}

export interface ExpenseResponse {
  id: string;
  groupId?: string;
  amount: number;
  description: string;
  currency: string;
  paidByUserId?: string;// for add/edit expense i.e; expenseform
  paidBy?: User; // for group dashboard
  splitType: SplitType;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: string;
  participants: ExpenseParticipants[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseRequest {
  amount: number;
  description: string;
  currency: string;
  paidByUserId?: string;
  splitType: SplitType;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: string;
  participants: ExpenseParticipants[];
}
export interface GroupOverviewItem {//landing page
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  expenses: { amount: number }[];
  members: string[];
}

export interface GroupResponse {//group view i.e; dashboard
  id: string;
  name: string;
  currency: string;
  createdAt?: string;
  expenses?: ExpenseResponse[];
  members: User[];
}

export interface EditExpenseResponse {//group view i.e; dashboard
  group: {
    id: string;
    name: string;
    currency: string;
    createdAt?: string;
    members: User[];
  };
  expense: ExpenseResponse;
}

export interface GroupRequest {//group payload i.e; add group
  name: string;
  currency: string;
  members: string[];
}

// ========== GROUP OPERATIONS ==========

// Get a single group
export async function getGroup(groupId: string): Promise<GroupResponse | undefined> {
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
): Promise<GroupResponse> {

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

  const { data, error: memberError } = await supabase
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
    members: data
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
    createdAt: row.created_at,
    members: row.group_members.map((gm) => gm.user.name),
  }));
}

export async function loadGroupDetails(//for group dashboard 
  groupId: string
): Promise<GroupResponse | null> {

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
        participants:expense_participants (
          user:users (
            id,
            name
          ),
          amount:share_amount,
          percent:share_percent
        )
      ),
      group_members!inner (
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
    createdAt: data.created_at,
    members: data.group_members.map((gm) => ({
      id: gm.user.id,
      name: gm.user.name,
    })),
    expenses: (data.expenses || []).map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      currency: e.currency,
      paidBy: {
        id: e.paidBy.id,
        name: e.paidBy.name,
      },
      splitType: e.split_type as SplitType,
      category: e.category as CategoryKey,
      subcategory: e.subcategory as SubcategoryId,
      date: e.date,
      participants: e.participants || []
    })),
  };
}

// ========== EXPENSE OPERATIONS ==========

export async function editExpense(
  groupId: string,
  expenseId: string
): Promise<EditExpenseResponse | null> {

  const { data, error } = await supabase
    .from("groups")
    .select(`
      id,
      name,
      currency,
      members:group_members!inner (
        user:users (
          id,
          name
        )
      ),
      expense:expenses (
        id,
        description,
        amount,
        currency,
        paidByUserId:paid_by_user_id,
        split_type,
        category,
        subcategory,
        date,
        participants:expense_participants (
          user:users (
            id,
            name
          ),
          amount:share_amount,
          percent:share_percent
        )
      )
    `)
    .eq("id", groupId)
    .eq("group_members.is_active", true)
    .eq("expenses.id", expenseId)
    .single();

  if (error || !data) {
    console.error("Error loading group details:", error);
    return null;
  }

  const expenseRow = data.expense?.[0];
  if (!expenseRow) return null;

  return {
    group: {
      id: data.id,
      name: data.name,
      currency: data.currency,
      members: data.members.map((gm) => ({
        id: gm.user.id,
        name: gm.user.name,
      }))
    },

    expense: {
      id: expenseRow.id,
      amount: expenseRow.amount,
      description: expenseRow.description,
      currency: expenseRow.currency,
      paidByUserId: expenseRow.paidByUserId,
      splitType: expenseRow.split_type,  
      category: expenseRow.category as CategoryKey,
      subcategory: expenseRow.subcategory,
      date: expenseRow.date,
      participants: expenseRow.participants.map((p) => ({
        user: {
          id: p.user.id,
          name: p.user.name
        },
        amount: p.amount,
        percent: p.percent
      }))
    }
  };
}

// Get single expense edit expense
// Get single expense (new schema)
export async function getExpense(
  groupId: string,
  expenseId: string
): Promise<ExpenseResponse | undefined> {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        *,
        participants:expense_participants (
          user:users (
            id
          ),
          amount:share_amount,
          percent:share_percent
        )
      `)
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
      paidByUserId: data.paid_by_user_id,
      participants: data.participants ?? [],
      splitType: data.split_type as SplitType,
      category: data.category as CategoryKey,
      subcategory: data.subcategory as SubcategoryId,
      date: data.date,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error("Error getting expense:", error);
    return undefined;
  }
}

// Add expense to a group
export async function addExpense(
  groupId: string,
  data: ExpenseRequest
): Promise<ExpenseResponse | undefined> {
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
          split_type: data.splitType,
          category: data.category,
          subcategory: data.subcategory,
          date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (expenseError) throw expenseError;

    // 2. Insert participants + RETURN them
    let participants;
    if (data.participants?.length) {
      const participantsPayload = data.participants.map((p) => ({
        expense_id: expenseRow.id,
        user_id: p.user.id,
        share_amount: p.amount,
        share_percent: p.percent ?? null,
      }));

      const { data: participantsData, error: participantsError } = await supabase
        .from("expense_participants")
        .insert(participantsPayload)
        .select();

      participants = participantsData;

      if (participantsError) throw participantsError;

      // Map DB rows → domain objects
    }

    // 3. Return domain object
    return {
      id: expenseRow.id,
      groupId: expenseRow.group_id,
      description: expenseRow.description,
      amount: Number(expenseRow.amount),
      currency: expenseRow.currency,
      paidByUserId: expenseRow.paid_by_user_id,
      splitType: expenseRow.split_type as SplitType,
      category: expenseRow.category as CategoryKey,
      subcategory: expenseRow.subcategory as SubcategoryId,
      date: expenseRow.date,
      participants,
      createdAt: expenseRow.created_at,
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
  data: ExpenseRequest
): Promise<ExpenseResponse | undefined> {
  try {
    // 1. Update expense row
    const { data: expenseRow, error: expenseError } = await supabase
      .from("expenses")
      .update({
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        paid_by_user_id: data.paidByUserId,
        split_type: data.splitType,
        category: data.category,
        subcategory: data.subcategory,
        date: data.date ?? new Date().toISOString(),
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

    let participants;
    // 3. Insert updated participants
    if (data.participants?.length) {
      const participantsPayload = data.participants.map((p) => ({
        expense_id: expenseId,
        user_id: p.user.id,
        share_amount: p.amount,
        share_percent: p.percent ?? null,
      }));

      const { data: participantsData, error: insertError } = await supabase
        .from("expense_participants")
        .insert(participantsPayload)
        .select();

      participants = participantsData;

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
      splitType: expenseRow.split_type as SplitType,
      category: expenseRow.category as CategoryKey,
      subcategory: expenseRow.subcategory as SubcategoryId,
      date: expenseRow.date,
      participants,
      createdAt: expenseRow.created_at,
      updatedAt: expenseRow.updated_at
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
