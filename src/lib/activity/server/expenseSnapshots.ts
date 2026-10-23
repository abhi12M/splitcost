// Reads an expense's full current state (with member names) for activity, and
// in the shape the dashboard lists it.
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { ExpenseResponse, SplitType } from "@/lib/storage";
import type { ExpenseSnapshot } from "../expenseSnapshot";

type SnapshotRow = {
  id: string;
  group_id: string;
  description: string;
  amount: number | string;
  currency: string;
  date: string;
  notes: string | null;
  category: string;
  subcategory: string;
  split_type: SplitType;
  paid_by_user_id: string | null;
  attachment_data_url: string | null;
  created_at: string;
  updated_at: string | null;
  revision: number | string | null;
  payer: { name: string } | null;
  expense_payers: { user_id: string; amount: number | string; users: { name: string } | null }[];
  expense_participants: {
    user_id: string;
    share_amount: number | string | null;
    share_percent: number | string | null;
    users: { name: string } | null;
  }[];
};

const SNAPSHOT_COLUMNS = `
  id, group_id, description, amount, currency, date, notes, category, subcategory,
  split_type, paid_by_user_id, attachment_data_url, created_at, updated_at, revision,
  payer:users!expenses_paid_by_user_id_fkey ( name ),
  expense_payers ( user_id, amount, users ( name ) ),
  expense_participants ( user_id, share_amount, share_percent, users ( name ) )
`;

const toNumber = (value: number | string | null | undefined) => Number(value ?? 0) || 0;

function toSnapshot(row: SnapshotRow): ExpenseSnapshot {
  const amount = toNumber(row.amount);
  // A single payer is stored on the expense; several payers in their own table.
  const payers = row.expense_payers.length
    ? row.expense_payers.map((p) => ({ id: p.user_id, name: p.users?.name ?? "", amount: toNumber(p.amount) }))
    : row.paid_by_user_id
      ? [{ id: row.paid_by_user_id, name: row.payer?.name ?? "", amount }]
      : [];

  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount,
    currency: row.currency,
    date: String(row.date),
    notes: row.notes,
    category: row.category,
    subcategory: row.subcategory,
    splitType: row.split_type,
    payers,
    participants: row.expense_participants.map((p) => ({
      id: p.user_id,
      name: p.users?.name ?? "",
      amount: toNumber(p.share_amount),
      percent: p.share_percent === null ? null : toNumber(p.share_percent),
    })),
    hasAttachment: Boolean(row.attachment_data_url),
  };
}

const byUserName = <T extends { user: { name: string } }>(a: T, b: T) => a.user.name.localeCompare(b.user.name);

/**
 * The expense as the dashboard lists it (same fields as `load_group_details`,
 * plus notes and revision), so a client can put it straight into its list.
 */
function toResponse(row: SnapshotRow): ExpenseResponse {
  return {
    id: row.id,
    groupId: row.group_id,
    amount: toNumber(row.amount),
    description: row.description,
    notes: row.notes,
    currency: row.currency,
    paidBy: row.paid_by_user_id ? { id: row.paid_by_user_id, name: row.payer?.name ?? "" } : null,
    payers: row.expense_payers
      .map((p) => ({ user: { id: p.user_id, name: p.users?.name ?? "" }, amount: toNumber(p.amount) }))
      .sort(byUserName),
    splitType: row.split_type,
    category: row.category as ExpenseResponse["category"],
    subcategory: row.subcategory as ExpenseResponse["subcategory"],
    date: String(row.date),
    participants: row.expense_participants
      .map((p) => ({
        user: { id: p.user_id, name: p.users?.name ?? "" },
        amount: p.share_amount === null ? null : toNumber(p.share_amount),
        percent: p.share_percent === null ? null : toNumber(p.share_percent),
      }))
      .sort(byUserName),
    attachment_data_url: row.attachment_data_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    revision: row.revision === null ? undefined : toNumber(row.revision),
  };
}

/**
 * One read of an expense, as the activity snapshot and as a dashboard entry.
 * Null when the expense doesn't exist (or can't be read).
 */
export async function loadExpenseDetails(
  expenseId: string
): Promise<{ snapshot: ExpenseSnapshot; response: ExpenseResponse } | null> {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select(SNAPSHOT_COLUMNS)
    .eq("id", expenseId)
    .maybeSingle();
  if (error) {
    console.error("loadExpenseSnapshot error:", error);
    return null;
  }
  if (!data) return null;
  const row = data as unknown as SnapshotRow;
  return { snapshot: toSnapshot(row), response: toResponse(row) };
}

/** Null when the expense doesn't exist (or can't be read); activity is then skipped. */
export async function loadExpenseSnapshot(expenseId: string): Promise<ExpenseSnapshot | null> {
  return (await loadExpenseDetails(expenseId))?.snapshot ?? null;
}
