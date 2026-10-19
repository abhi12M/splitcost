// A new expense can reach the server while its answer is lost (the connection
// drops in between). The form then stays filled for a retry, and sending it
// again would add the expense twice. So when an add fails that way, the app
// remembers it, and the next identical add first asks the server whether the
// first one arrived, and uses that expense instead of sending a new one.

import type { EditExpenseInterface, ExpenseRequest, ExpenseResponse } from "@/lib/storage";
import { expenseFormToResponse, isDashboardExpense, readCachedDashboard } from "./cache";
import { trackedFetch } from "./network";

/** How long a failed add is remembered; also the window an arrived expense must fall in. */
const REMEMBER_MS = 30 * 60 * 1000;

type FailedAdd = { groupId: string; fingerprint: string; knownIds: string[]; at: number };
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

/** Call when an add failed without a definite answer from the server. */
export async function rememberFailedAdd(groupId: string, request: ExpenseRequest) {
  const fingerprint = expenseFingerprint(request);
  // Expenses that already look the same are not the lost one.
  const dashboard = await readCachedDashboard(groupId);
  const knownIds = (dashboard?.expenses ?? [])
    .filter((expense) => expenseFingerprint(expense) === fingerprint)
    .map((expense) => expense.id);
  failedAdd = { groupId, fingerprint, knownIds, at: Date.now() };
}

/**
 * The expense a failed add left on the server, if the same add is being sent
 * again and the first one did arrive; otherwise null, and the add goes ahead.
 */
export async function findArrivedAdd(groupId: string, request: ExpenseRequest): Promise<ExpenseResponse | null> {
  const pending = failedAdd;
  if (!pending || pending.groupId !== groupId || Date.now() - pending.at > REMEMBER_MS) return null;
  if (pending.fingerprint !== expenseFingerprint(request)) return null;

  try {
    const res = await trackedFetch(`/api/groups/${groupId}/dashboard`, { cache: "no-store" });
    if (!res.ok) return null;
    const dashboard = (await res.json()) as { expenses?: unknown[] } | null;
    const known = new Set(pending.knownIds);
    const arrived = (dashboard?.expenses ?? []).find(
      (expense): expense is ExpenseResponse =>
        isDashboardExpense(expense) &&
        !known.has(expense.id) &&
        // Server time against this device's clock: allow for the two differing.
        Date.now() - Date.parse(expense.createdAt) < REMEMBER_MS &&
        expenseFingerprint(expense) === pending.fingerprint
    );
    if (!arrived) return null;
    failedAdd = null;
    // The dashboard's entry has no notes or revision; the expense's own
    // endpoint has everything an edit screen needs.
    const full = await trackedFetch(`/api/expenses/${arrived.id}`, { cache: "no-store" }).catch(() => null);
    if (full?.ok) {
      const details = (await full.json()) as EditExpenseInterface;
      if (details?.expense && details.group) return expenseFormToResponse(details.expense, details.group);
    }
    return arrived;
  } catch {
    // Can't ask (offline): the add itself will fail the same way.
    return null;
  }
}

/** Call when an add got a definite answer, so nothing stale is matched later. */
export function forgetFailedAdd() {
  failedAdd = null;
}
