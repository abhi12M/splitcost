import {
  EXPENSE_CATEGORIES,
  type CategoryKey,
} from "@/components/icons/CategoryIcons";
import { supabaseAdmin } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_SPLIT_TYPES = new Set(["equal", "percentage", "custom"]);
const MAX_AMOUNT = 99_999_999.99;
const MAX_PARTICIPANTS = 50;

export function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function validateAmount(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Amount must be a number";
  if (value <= 0) return "Amount must be greater than zero";
  if (value > MAX_AMOUNT) return "Amount is too large";
  return null;
}

export function validateSplitType(value: unknown): string | null {
  if (typeof value !== "string" || !VALID_SPLIT_TYPES.has(value)) {
    return "Invalid split type";
  }
  return null;
}

export function validateCategory(category: unknown, subcategory: unknown): string | null {
  if (typeof category !== "string" || typeof subcategory !== "string") {
    return "Category and subcategory are required";
  }
  const config = EXPENSE_CATEGORIES[category as CategoryKey];
  if (!config) return "Invalid category";
  if (!config.subcategories.some((s) => s.id === subcategory)) {
    return "Invalid subcategory for the given category";
  }
  return null;
}

export function validateExpenseDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_RE.test(value)) return "Date must be in YYYY-MM-DD format";
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() + 1 !== m || parsed.getUTCDate() !== d) {
    return "Invalid date";
  }
  if (y < 1900 || y > 2100) return "Date is out of range";
  return null;
}

export function validateParticipants(
  participants: unknown,
  splitType: string,
  expenseAmount: number,
): string | null {
  if (!Array.isArray(participants)) return "Participants must be an array";
  if (participants.length === 0) return "At least one participant is required";
  if (participants.length > MAX_PARTICIPANTS) return "Too many participants";

  const seenUserIds = new Set<string>();
  for (const p of participants) {
    if (!p || typeof p !== "object") return "Invalid participant";
    const entry = p as Record<string, unknown>;
    if (!isValidUUID(entry.userId)) return "Invalid participant userId";
    if (seenUserIds.has(entry.userId)) return "Duplicate participant userId";
    seenUserIds.add(entry.userId);
    if (entry.amount !== null && entry.amount !== undefined) {
      if (typeof entry.amount !== "number" || !Number.isFinite(entry.amount) || entry.amount < 0) {
        return "Invalid participant amount";
      }
    }
    if (entry.percent !== null && entry.percent !== undefined) {
      if (typeof entry.percent !== "number" || !Number.isFinite(entry.percent) || entry.percent < 0 || entry.percent > 100) {
        return "Invalid participant percent";
      }
    }
  }

  if (splitType === "custom") {
    const sum = participants.reduce((s: number, p: Record<string, unknown>) => s + Number(p.amount || 0), 0);
    if (Math.abs(sum - expenseAmount) > 0.01) return "Participant amounts must equal the expense amount";
  }
  if (splitType === "percentage") {
    const sum = participants.reduce((s: number, p: Record<string, unknown>) => s + Number(p.percent || 0), 0);
    if (Math.abs(sum - 100) > 0.01) return "Participant percentages must sum to 100";
  }

  return null;
}

export function validatePayers(payers: unknown, expenseAmount: number): string | null {
  if (payers === undefined || payers === null) return null;
  if (!Array.isArray(payers)) return "Payers must be an array";
  if (payers.length === 0) return null;

  const seenPayerIds = new Set<string>();
  for (const p of payers) {
    if (!p || typeof p !== "object") return "Invalid payer";
    const entry = p as Record<string, unknown>;
    if (!isValidUUID(entry.userId)) return "Invalid payer userId";
    if (seenPayerIds.has(entry.userId)) return "Duplicate payer userId";
    seenPayerIds.add(entry.userId);
    if (typeof entry.amount !== "number" || !Number.isFinite(entry.amount) || entry.amount <= 0) {
      return "Invalid payer amount";
    }
  }

  const sum = payers.reduce((s: number, p: Record<string, unknown>) => s + (p.amount as number), 0);
  if (Math.abs(sum - expenseAmount) > 0.01) return "Payer amounts must equal the expense amount";

  return null;
}

/**
 * Loads the group's member user IDs and checks that every user ID referenced
 * in paidByUserId, participants, and payers belongs to the group.
 */
export async function validateGroupMembership(
  groupId: string,
  paidByUserId: unknown,
  participants: { userId: string }[],
  payers: { userId: string }[] | null,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (error) {
    console.error("validateGroupMembership error:", error);
    return "Failed to verify group membership";
  }

  const memberIds = new Set((data ?? []).map((r) => r.user_id as string));

  if (typeof paidByUserId === "string" && paidByUserId && !memberIds.has(paidByUserId)) {
    return "Payer is not a member of this group";
  }

  for (const p of participants) {
    if (!memberIds.has(p.userId)) return "A participant is not a member of this group";
  }

  if (payers) {
    for (const p of payers) {
      if (!memberIds.has(p.userId)) return "A payer is not a member of this group";
    }
  }

  return null;
}
