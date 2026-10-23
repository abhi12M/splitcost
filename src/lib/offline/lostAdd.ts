// A new expense can reach the server while its answer is lost (the connection
// drops in between). The form then stays filled for a retry, and sending it
// again would add the expense twice. So every add carries a random request id,
// and when an add fails that way the app remembers the id; sending the same
// expense again reuses it, and the server answers with the expense the first
// try added instead of adding another (see add_expense).

import type { ExpenseRequest } from "@/lib/storage";

/** How long a failed add's request id is kept for a retry. */
const REMEMBER_MS = 30 * 60 * 1000;

type FailedAdd = { groupId: string; fingerprint: string; requestId: string; at: number };
let failedAdd: FailedAdd | null = null;

type Comparable = {
  description: string;
  amount: number | string;
  splitType: string;
  date: string;
  paidBy?: { id: string } | null;
  paidByUserId?: string | null;
  payers?: ({ userId: string; amount: number } | { user: { id: string }; amount: number })[];
  participants: (
    | { userId: string; amount?: number | null; percent?: number | null }
    | { user: { id: string }; amount?: number | null; percent?: number | null }
  )[];
};

const money = (value: number | string | null | undefined) => (Math.round((Number(value) || 0) * 100) / 100).toFixed(2);
const userOf = (item: { userId: string } | { user: { id: string } }) => ("userId" in item ? item.userId : item.user.id);

/** The same string for an expense as sent and as the server lists it. */
export function expenseFingerprint(expense: Comparable) {
  const payers = expense.payers?.length
    ? expense.payers.map((payer) => `${userOf(payer)}:${money(payer.amount)}`)
    : [`${expense.paidByUserId ?? expense.paidBy?.id ?? ""}:${money(expense.amount)}`];
  const participants = expense.participants.map((participant) => {
    const id = userOf(participant);
    if (expense.splitType === "equal") return id;
    if (expense.splitType === "percentage") return `${id}:${money(participant.percent)}`;
    return `${id}:${money(participant.amount)}`;
  });
  return JSON.stringify([
    expense.description.trim().replace(/\s+/g, " ").toLowerCase(),
    money(expense.amount),
    expense.splitType,
    String(expense.date).slice(0, 10),
    payers.sort(),
    participants.sort(),
  ]);
}

/**
 * The request id to send with this add: the failed add's, if this is the same
 * expense being sent again; otherwise a new one. Undefined where the browser
 * can't make one (plain http other than localhost); the add then goes without.
 */
export function requestIdForAdd(groupId: string, request: ExpenseRequest): string | undefined {
  const pending = failedAdd;
  if (
    pending &&
    pending.groupId === groupId &&
    Date.now() - pending.at <= REMEMBER_MS &&
    pending.fingerprint === expenseFingerprint(request)
  ) {
    return pending.requestId;
  }
  return globalThis.crypto?.randomUUID?.();
}

/** Call when an add failed without a definite answer from the server. */
export function rememberFailedAdd(groupId: string, request: ExpenseRequest, requestId: string | undefined) {
  failedAdd = requestId ? { groupId, fingerprint: expenseFingerprint(request), requestId, at: Date.now() } : null;
}

/** Call when an add got a definite answer, so its id isn't reused for a new expense. */
export function forgetFailedAdd() {
  failedAdd = null;
}
