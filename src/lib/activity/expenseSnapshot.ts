// An expense's full state at one moment, with member names resolved. The API
// takes one before and after a change; the activity is derived from the two.
import type { SplitType } from "@/lib/storage";
import type { ActivityShare, ExpenseSummary, SettlementSummary } from "./types";

export type ExpenseSnapshot = {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  notes: string | null;
  category: string;
  subcategory: string;
  splitType: SplitType;
  payers: ActivityShare[];
  participants: (ActivityShare & { percent: number | null })[];
  hasAttachment: boolean;
};

export const SETTLEMENT_CATEGORY = "settlement";

export function isSettlement(snapshot: ExpenseSnapshot) {
  return snapshot.category === SETTLEMENT_CATEGORY;
}

export function toExpenseSummary(snapshot: ExpenseSnapshot): ExpenseSummary {
  return {
    description: snapshot.description,
    amount: snapshot.amount,
    currency: snapshot.currency,
    splitType: snapshot.splitType,
    payers: snapshot.payers,
    participants: snapshot.participants.map(({ id, name, amount }) => ({ id, name, amount })),
  };
}

/** A settlement is stored as an expense: the payer paid the one participant. */
export function toSettlementSummary(snapshot: ExpenseSnapshot): SettlementSummary {
  const from = snapshot.payers[0] ?? { id: "", name: "" };
  const to = snapshot.participants[0] ?? { id: "", name: "" };
  return {
    from: { id: from.id, name: from.name },
    to: { id: to.id, name: to.name },
    amount: snapshot.amount,
    currency: snapshot.currency,
  };
}
