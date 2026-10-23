// Turns expense changes into activity events. Routes call these after a save
// succeeds; each never throws (see recordActivity).
import "server-only";

import { diffExpenseSnapshots } from "../diffExpense";
import { isSettlement, toExpenseSummary, toSettlementSummary, type ExpenseSnapshot } from "../expenseSnapshot";
import type { ActivityChange } from "../types";
import { recordActivity } from "./activityStore";

type Origin = string | null | undefined;

export function recordExpenseAdded(expense: ExpenseSnapshot, originSessionId?: Origin) {
  return recordActivity([
    isSettlement(expense)
      ? { groupId: expense.groupId, expenseId: expense.id, kind: "settlement_added", data: toSettlementSummary(expense), originSessionId }
      : { groupId: expense.groupId, expenseId: expense.id, kind: "expense_added", data: { expense: toExpenseSummary(expense) }, originSessionId },
  ]);
}

export function recordExpenseDeleted(expense: ExpenseSnapshot, originSessionId?: Origin) {
  return recordActivity([
    isSettlement(expense)
      ? { groupId: expense.groupId, expenseId: expense.id, kind: "settlement_deleted", data: toSettlementSummary(expense), originSessionId }
      : { groupId: expense.groupId, expenseId: expense.id, kind: "expense_deleted", data: { expense: toExpenseSummary(expense) }, originSessionId },
  ]);
}

/** Records the given changes as one update (one save = one entry). Skips when nothing changed. */
export function recordExpenseChanges(expense: ExpenseSnapshot, changes: ActivityChange[], originSessionId?: Origin) {
  if (!changes.length) return Promise.resolve();
  return recordActivity([
    {
      groupId: expense.groupId,
      expenseId: expense.id,
      kind: "expense_updated",
      data: { description: expense.description, changes },
      originSessionId,
    },
  ]);
}

/** A full edit: compares the states before and after the save. */
export function recordExpenseEdited(before: ExpenseSnapshot, after: ExpenseSnapshot, originSessionId?: Origin) {
  return recordExpenseChanges(after, diffExpenseSnapshots(before, after), originSessionId);
}
