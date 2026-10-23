import assert from "node:assert/strict";
import test from "node:test";

import { diffExpenseSnapshots } from "../src/lib/activity/diffExpense";
import type { ExpenseSnapshot } from "../src/lib/activity/expenseSnapshot";
import { collapseRapidUpdates } from "../src/lib/activity/feed";
import type { ActivityEvent } from "../src/lib/activity/types";

const ann = { id: "a", name: "Ann" };
const bee = { id: "b", name: "Bee" };
const cal = { id: "c", name: "Cal" };

function snapshot(overrides: Partial<ExpenseSnapshot> = {}): ExpenseSnapshot {
  return {
    id: "e1",
    groupId: "g1",
    description: "Cab",
    amount: 900,
    currency: "INR",
    date: "2026-10-04",
    notes: null,
    category: "uncategorized",
    subcategory: "general",
    splitType: "equal",
    payers: [{ ...ann, amount: 900 }],
    participants: [
      { ...ann, amount: 450, percent: null },
      { ...bee, amount: 450, percent: null },
    ],
    hasAttachment: false,
    ...overrides,
  };
}

test("an unchanged expense has no changes", () => {
  assert.deepEqual(diffExpenseSnapshots(snapshot(), snapshot({ description: " Cab " })), []);
});

test("amount and payer changes are reported, an equal split's shares are not", () => {
  const after = snapshot({
    amount: 1150,
    payers: [{ ...bee, amount: 1150 }],
    participants: [
      { ...ann, amount: 575, percent: null },
      { ...bee, amount: 575, percent: null },
    ],
  });
  assert.deepEqual(diffExpenseSnapshots(snapshot(), after), [
    { field: "amount", from: 900, to: 1150 },
    { field: "paidBy", from: ["Ann"], to: ["Bee"] },
  ]);
});

test("people added to or removed from the split are named", () => {
  const after = snapshot({
    participants: [
      { ...ann, amount: 450, percent: null },
      { ...cal, amount: 450, percent: null },
    ],
  });
  assert.deepEqual(diffExpenseSnapshots(snapshot(), after), [
    { field: "split", fromType: "equal", toType: "equal", added: ["Cal"], removed: ["Bee"], sharesChanged: false, shares: [] },
  ]);
});

test("custom shares changing between the same people list each person's amounts", () => {
  const before = snapshot({ splitType: "custom" });
  const after = snapshot({
    splitType: "custom",
    participants: [
      { ...ann, amount: 600, percent: null },
      { ...bee, amount: 300, percent: null },
    ],
  });
  assert.deepEqual(diffExpenseSnapshots(before, after), [
    {
      field: "split",
      fromType: "custom",
      toType: "custom",
      added: [],
      removed: [],
      sharesChanged: true,
      shares: [
        { name: "Ann", from: 450, to: 600, unit: "amount" },
        { name: "Bee", from: 450, to: 300, unit: "amount" },
      ],
    },
  ]);
});

test("percentage shares are compared as percentages", () => {
  const before = snapshot({
    splitType: "percentage",
    participants: [
      { ...ann, amount: 225, percent: 25 },
      { ...bee, amount: 675, percent: 75 },
    ],
  });
  const after = snapshot({
    splitType: "percentage",
    participants: [
      { ...ann, amount: 360, percent: 40 },
      { ...bee, amount: 540, percent: 60 },
    ],
  });
  assert.deepEqual(diffExpenseSnapshots(before, after), [
    {
      field: "split",
      fromType: "percentage",
      toType: "percentage",
      added: [],
      removed: [],
      sharesChanged: true,
      shares: [
        { name: "Ann", from: 25, to: 40, unit: "percent" },
        { name: "Bee", from: 75, to: 60, unit: "percent" },
      ],
    },
  ]);
});

test("notes are reported as added, updated or removed", () => {
  const withNotes = snapshot({ notes: "<p>Airport</p>" });
  assert.deepEqual(diffExpenseSnapshots(snapshot(), withNotes), [{ field: "notes", action: "added" }]);
  assert.deepEqual(diffExpenseSnapshots(withNotes, snapshot({ notes: "<p>Station</p>" })), [{ field: "notes", action: "updated" }]);
  assert.deepEqual(diffExpenseSnapshots(withNotes, snapshot({ notes: "" })), [{ field: "notes", action: "removed" }]);
});

test("notes keep no text; category, date and image are reported", () => {
  const after = snapshot({
    notes: "<p>Airport</p>",
    category: "transportation",
    subcategory: "taxi",
    date: "2026-10-05",
    hasAttachment: true,
  });
  assert.deepEqual(diffExpenseSnapshots(snapshot(), after), [
    { field: "date", from: "2026-10-04", to: "2026-10-05" },
    {
      field: "category",
      from: { category: "uncategorized", subcategory: "general" },
      to: { category: "transportation", subcategory: "taxi" },
    },
    { field: "notes", action: "added" },
    { field: "attachment", action: "added" },
  ]);
});

function event(id: string, kind: ActivityEvent["kind"], expenseId: string | null, minutesAgo: number): ActivityEvent {
  return {
    id,
    groupId: "g1",
    expenseId,
    kind,
    data: {} as never,
    actorName: null,
    createdAt: new Date(Date.UTC(2026, 9, 5, 12) - minutesAgo * 60_000).toISOString(),
  } as ActivityEvent;
}

const ids = (events: ActivityEvent[]) => events.map((e) => e.id);

test("updates right after an expense was added fold into the added line", () => {
  const feed = [event("u2", "expense_updated", "e1", 1), event("u1", "expense_updated", "e1", 4), event("add", "expense_added", "e1", 5)];
  assert.deepEqual(ids(collapseRapidUpdates(feed)), ["add"]);
});

test("a burst of updates shows once, at the latest one, in time order", () => {
  const feed = [
    event("u3", "expense_updated", "e1", 1),
    event("other", "expense_added", "e2", 2),
    event("u2", "expense_updated", "e1", 3),
    event("u1", "expense_updated", "e1", 6),
  ];
  assert.deepEqual(ids(collapseRapidUpdates(feed)), ["u3", "other"]);
});

test("updates further apart than the window each show", () => {
  const feed = [event("u2", "expense_updated", "e1", 1), event("u1", "expense_updated", "e1", 30)];
  assert.deepEqual(ids(collapseRapidUpdates(feed)), ["u2", "u1"]);
});

test("member and group events are never collapsed", () => {
  const feed = [event("m2", "member_added", null, 1), event("m1", "member_added", null, 2)];
  assert.deepEqual(ids(collapseRapidUpdates(feed)), ["m2", "m1"]);
});
