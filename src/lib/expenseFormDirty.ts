/**
 * Builds a normalized, order-independent fingerprint of an expense form's
 * current values, so callers can detect real changes (description edited,
 * then edited back) instead of relying on a "has any input event ever fired"
 * flag, which never resets once tripped.
 */

type SnapshotParticipant = { userId: string; percent: number | null; amount: number | null };
type SnapshotPayer = { userId: string; amount: number | null };

export type ExpenseFormSnapshotInput = {
  description: string;
  amount: string;
  currency: string;
  paidByUserId: string;
  category: string;
  subcategory: string;
  splitType: string;
  participants: SnapshotParticipant[];
  /** Pre-formatted (e.g. via formatDateForDB) so this module stays date-library agnostic. */
  date: string;
  isMultiplePayers: boolean;
  payers: SnapshotPayer[];
  attachment: { url?: string; name?: string } | null;
  notes: string;
};

function byUserId<T extends { userId: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.userId.localeCompare(b.userId));
}

export function buildExpenseFormSnapshot(input: ExpenseFormSnapshotInput): string {
  return JSON.stringify({
    description: input.description.trim(),
    amount: input.amount,
    currency: input.currency,
    paidByUserId: input.paidByUserId,
    category: input.category,
    subcategory: input.subcategory,
    splitType: input.splitType,
    participants: byUserId(input.participants).map((p) => ({
      userId: p.userId,
      percent: p.percent ?? null,
      amount: p.amount ?? null,
    })),
    date: input.date,
    isMultiplePayers: input.isMultiplePayers,
    payers: byUserId(input.payers).map((p) => ({ userId: p.userId, amount: p.amount ?? null })),
    attachment: input.attachment ? { url: input.attachment.url ?? null, name: input.attachment.name ?? null } : null,
    notes: input.notes,
  });
}
