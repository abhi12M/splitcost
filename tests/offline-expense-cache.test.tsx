import assert from "node:assert/strict";
import test from "node:test";

import { isDashboardExpense, withExpenseInList } from "../src/lib/offline/cache";
import { expenseFingerprint } from "../src/lib/offline/lostAdd";
import type { ExpenseResponse } from "../src/lib/storage";

const user = (id: string) => ({ id, name: id.toUpperCase() });

const listed = (overrides: Partial<ExpenseResponse> = {}): ExpenseResponse => ({
  id: "e1",
  amount: 90,
  description: "Dinner",
  currency: "INR",
  paidBy: user("a"),
  payers: [],
  splitType: "equal",
  category: "food" as ExpenseResponse["category"],
  subcategory: "restaurants" as ExpenseResponse["subcategory"],
  date: "2026-10-19",
  participants: [
    { user: user("a"), amount: 45, percent: null },
    { user: user("b"), amount: 45, percent: null },
  ],
  createdAt: "2026-10-19T10:00:00.000Z",
  ...overrides,
});

test("an expense as sent and as the server lists it have the same fingerprint", () => {
  const sent = expenseFingerprint({
    description: "  dinner ",
    amount: 90,
    splitType: "equal",
    date: "2026-10-19",
    paidByUserId: "a",
    participants: [
      { userId: "b", amount: null, percent: null },
      { userId: "a", amount: null, percent: null },
    ],
  });
  assert.equal(sent, expenseFingerprint(listed()));
});

test("a different person, amount or date changes the fingerprint", () => {
  const base = expenseFingerprint(listed());
  assert.notEqual(base, expenseFingerprint(listed({ amount: 91 })));
  assert.notEqual(base, expenseFingerprint(listed({ date: "2026-10-20" })));
  assert.notEqual(base, expenseFingerprint(listed({ paidBy: user("b") })));
  assert.notEqual(
    base,
    expenseFingerprint(listed({ participants: [{ user: user("a"), amount: 90, percent: null }] }))
  );
});

test("unequal shares count in the fingerprint, equal ones do not", () => {
  const unequal = (a: number, b: number) =>
    expenseFingerprint(
      listed({
        splitType: "custom" as ExpenseResponse["splitType"],
        participants: [
          { user: user("a"), amount: a, percent: null },
          { user: user("b"), amount: b, percent: null },
        ],
      })
    );
  assert.notEqual(unequal(50, 40), unequal(60, 30));
  assert.equal(unequal(50, 40), unequal(50, 40));
});

test("a saved expense replaces the one with its id and the list keeps the dashboard's order", () => {
  const older = listed({ id: "old", date: "2026-10-01", createdAt: "2026-10-01T10:00:00.000Z" });
  const newest = listed({ id: "new", date: "2026-10-19", createdAt: "2026-10-19T12:00:00.000Z" });
  const sameDayEarlier = listed({ id: "e1", createdAt: "2026-10-19T09:00:00.000Z" });

  const added = withExpenseInList([older, sameDayEarlier], newest);
  assert.deepEqual(added.map((e) => e.id), ["new", "e1", "old"]);

  const replaced = withExpenseInList(added, { ...sameDayEarlier, amount: 100 });
  assert.equal(replaced.length, 3);
  assert.equal(replaced.find((e) => e.id === "e1")?.amount, 100);
});

test("only a complete dashboard expense is saved to the cache", () => {
  assert.equal(isDashboardExpense(listed()), true);
  assert.equal(isDashboardExpense(null), false);
  assert.equal(isDashboardExpense({ id: "x" }), false);
  // The old reply shape had participants without a user.
  assert.equal(
    isDashboardExpense({ ...listed(), participants: [{ userId: "a", amount: 1, percent: null }] }),
    false
  );
});
