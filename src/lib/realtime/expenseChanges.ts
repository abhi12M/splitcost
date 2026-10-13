// Shared by the expense APIs (sender) and open group/expense screens
// (receivers). Broadcasts are hints: receivers re-fetch from the API.

export type ExpenseEvent = "INSERT" | "UPDATE" | "DELETE";

/** What happened to an expense's receipt. */
export type ReceiptChange = "added" | "replaced" | "removed";

export type ExpenseBroadcast = {
  event: ExpenseEvent;
  expenseId: string;
  groupId: string;
  /** Tab that made the change, so it can ignore its own broadcast. */
  originSessionId: string | null;
  /** The expense's revision after the change (absent on DELETE). */
  revision?: number;
  /**
   * Set when the only thing that changed is the receipt. It never conflicts
   * with someone editing the expense's other fields.
   */
  receipt?: ReceiptChange;
};

export const EXPENSE_CHANGED_EVENT = "expense-changed";

export function expenseChangesChannel(groupId: string) {
  return `expense-changes:${groupId}`;
}

export function singleExpenseChannel(expenseId: string) {
  return `expense:${expenseId}`;
}
