import type { CategoryKey, SubcategoryId } from "@/components/icons/CategoryIcons";
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
  value: number|null; //for percentage only else null
  amount: number; //for equal and custom and percentage
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
export function detectCategoryFromDescription(description: string): { category: CategoryKey; subcategory: SubcategoryId } | null {
  const text = description.toLowerCase();

  // Keywords mapping
  const keywords: Record<string, { category: CategoryKey; subcategory: SubcategoryId }> = {
    // Entertainment
    game: { category: "entertainment", subcategory: "games" },
    gaming: { category: "entertainment", subcategory: "games" },
    movie: { category: "entertainment", subcategory: "movies" },
    cinema: { category: "entertainment", subcategory: "movies" },
    film: { category: "entertainment", subcategory: "movies" },
    theater: { category: "entertainment", subcategory: "movies" },
    theatre: { category: "entertainment", subcategory: "movies" },
    ticket: { category: "entertainment", subcategory: "movies" },
    concert: { category: "entertainment", subcategory: "music" },
    music: { category: "entertainment", subcategory: "music" },
    spotify: { category: "entertainment", subcategory: "music" },
    netflix: { category: "entertainment", subcategory: "movies" },
    sport: { category: "entertainment", subcategory: "sports" },
    gym: { category: "entertainment", subcategory: "sports" },
    fitness: { category: "entertainment", subcategory: "sports" },

    // Food & Drink
    restaurant: { category: "food", subcategory: "dining" },
    dinner: { category: "food", subcategory: "dining" },
    lunch: { category: "food", subcategory: "dining" },
    breakfast: { category: "food", subcategory: "dining" },
    cafe: { category: "food", subcategory: "dining" },
    coffee: { category: "food", subcategory: "dining" },
    food: { category: "food", subcategory: "dining" },
    eating: { category: "food", subcategory: "dining" },
    pizza: { category: "food", subcategory: "dining" },
    burger: { category: "food", subcategory: "dining" },
    sushi: { category: "food", subcategory: "dining" },
    grocery: { category: "food", subcategory: "groceries" },
    groceries: { category: "food", subcategory: "groceries" },
    supermarket: { category: "food", subcategory: "groceries" },
    market: { category: "food", subcategory: "groceries" },
    beer: { category: "food", subcategory: "liquor" },
    wine: { category: "food", subcategory: "liquor" },
    alcohol: { category: "food", subcategory: "liquor" },
    bar: { category: "food", subcategory: "liquor" },
    drinks: { category: "food", subcategory: "liquor" },
    liquor: { category: "food", subcategory: "liquor" },

    // Home
    tv: { category: "home", subcategory: "electronics" },
    laptop: { category: "home", subcategory: "electronics" },
    phone: { category: "home", subcategory: "electronics" },
    electronics: { category: "home", subcategory: "electronics" },
    computer: { category: "home", subcategory: "electronics" },
    furniture: { category: "home", subcategory: "furniture" },
    sofa: { category: "home", subcategory: "furniture" },
    chair: { category: "home", subcategory: "furniture" },
    table: { category: "home", subcategory: "furniture" },
    desk: { category: "home", subcategory: "furniture" },
    bed: { category: "home", subcategory: "furniture" },
    household: { category: "home", subcategory: "household" },
    cleaning: { category: "home", subcategory: "household" },
    supplies: { category: "home", subcategory: "household" },
    repair: { category: "home", subcategory: "maintenance" },
    maintenance: { category: "home", subcategory: "maintenance" },
    plumber: { category: "home", subcategory: "maintenance" },
    electrician: { category: "home", subcategory: "maintenance" },
    mortgage: { category: "home", subcategory: "mortgage" },
    rent: { category: "home", subcategory: "rent" },
    apartment: { category: "home", subcategory: "rent" },
    pet: { category: "home", subcategory: "pets" },
    dog: { category: "home", subcategory: "pets" },
    cat: { category: "home", subcategory: "pets" },
    vet: { category: "home", subcategory: "pets" },

    // Life
    childcare: { category: "life", subcategory: "childcare" },
    babysitter: { category: "life", subcategory: "childcare" },
    daycare: { category: "life", subcategory: "childcare" },
    school: { category: "life", subcategory: "education" },
    education: { category: "life", subcategory: "education" },
    tuition: { category: "life", subcategory: "education" },
    course: { category: "life", subcategory: "education" },
    class: { category: "life", subcategory: "education" },
    insurance: { category: "life", subcategory: "insurance" },
    doctor: { category: "life", subcategory: "medical" },
    hospital: { category: "life", subcategory: "medical" },
    medical: { category: "life", subcategory: "medical" },
    pharmacy: { category: "life", subcategory: "medical" },
    medicine: { category: "life", subcategory: "medical" },
    dentist: { category: "life", subcategory: "medical" },
    clothes: { category: "life", subcategory: "clothing" },
    clothing: { category: "life", subcategory: "clothing" },
    shoes: { category: "life", subcategory: "clothing" },
    shirt: { category: "life", subcategory: "clothing" },
    gift: { category: "life", subcategory: "gifts" },
    present: { category: "life", subcategory: "gifts" },
    birthday: { category: "life", subcategory: "gifts" },
    tax: { category: "life", subcategory: "taxes" },
    taxes: { category: "life", subcategory: "taxes" },

    // Utilities
    electric: { category: "utilities", subcategory: "electricity" },
    electricity: { category: "utilities", subcategory: "electricity" },
    power: { category: "utilities", subcategory: "electricity" },
    gas: { category: "utilities", subcategory: "gas" },
    heating: { category: "utilities", subcategory: "gas" },
    heat: { category: "utilities", subcategory: "gas" },
    water: { category: "utilities", subcategory: "water" },
    trash: { category: "utilities", subcategory: "trash" },
    garbage: { category: "utilities", subcategory: "trash" },
    internet: { category: "utilities", subcategory: "internet" },
    wifi: { category: "utilities", subcategory: "internet" },
    cable: { category: "utilities", subcategory: "internet" },

    // Transportation
    bike: { category: "transportation", subcategory: "bicycle" },
    bicycle: { category: "transportation", subcategory: "bicycle" },
    bus: { category: "transportation", subcategory: "bus" },
    train: { category: "transportation", subcategory: "bus" },
    metro: { category: "transportation", subcategory: "bus" },
    subway: { category: "transportation", subcategory: "bus" },
    transit: { category: "transportation", subcategory: "bus" },
    car: { category: "transportation", subcategory: "car" },
    uber: { category: "transportation", subcategory: "taxi" },
    lyft: { category: "transportation", subcategory: "taxi" },
    taxi: { category: "transportation", subcategory: "taxi" },
    cab: { category: "transportation", subcategory: "taxi" },
    fuel: { category: "transportation", subcategory: "fuel" },
    gasoline: { category: "transportation", subcategory: "fuel" },
    petrol: { category: "transportation", subcategory: "fuel" },
    parking: { category: "transportation", subcategory: "parking" },
    flight: { category: "transportation", subcategory: "plane" },
    plane: { category: "transportation", subcategory: "plane" },
    airport: { category: "transportation", subcategory: "plane" },
    airline: { category: "transportation", subcategory: "plane" },
    hotel: { category: "transportation", subcategory: "hotel" },
    airbnb: { category: "transportation", subcategory: "hotel" },
    hostel: { category: "transportation", subcategory: "hotel" },
    accommodation: { category: "transportation", subcategory: "hotel" },
    stay: { category: "transportation", subcategory: "hotel" },
  };

  for (const [keyword, result] of Object.entries(keywords)) {
    if (text.includes(keyword)) {
      return result;
    }
  }

  return null;
}