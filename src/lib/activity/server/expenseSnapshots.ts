// Reads an expense's full current state (with member names) for activity.
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import type { SplitType } from "@/lib/storage";
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
  split_type, paid_by_user_id, attachment_data_url,
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

/** Null when the expense doesn't exist (or can't be read); activity is then skipped. */
export async function loadExpenseSnapshot(expenseId: string): Promise<ExpenseSnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select(SNAPSHOT_COLUMNS)
    .eq("id", expenseId)
    .maybeSingle();
  if (error) {
    console.error("loadExpenseSnapshot error:", error);
    return null;
  }
  return data ? toSnapshot(data as unknown as SnapshotRow) : null;
}
