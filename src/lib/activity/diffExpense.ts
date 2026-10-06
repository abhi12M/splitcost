// Works out what changed between two states of the same expense. Pure, so the
// rules are unit-tested (tests/activity.test.tsx).
import type { ActivityChange, ShareChange } from "./types";
import type { ExpenseSnapshot } from "./expenseSnapshot";

const toCents = (value: number) => Math.round(value * 100);
const sameMoney = (a: number, b: number) => toCents(a) === toCents(b);
const normalizeText = (value: string | null | undefined) => (value ?? "").trim();
const sortedIds = (people: { id: string }[]) => people.map((p) => p.id).sort().join("|");

function payerChanges(before: ExpenseSnapshot, after: ExpenseSnapshot): ActivityChange[] {
  if (sortedIds(before.payers) !== sortedIds(after.payers)) {
    return [{ field: "paidBy", from: before.payers.map((p) => p.name), to: after.payers.map((p) => p.name) }];
  }
  // Same people: amounts only matter when the cost is shared between payers.
  const beforeAmounts = new Map(before.payers.map((p) => [p.id, p.amount]));
  const amountsChanged =
    after.payers.length > 1 && after.payers.some((p) => !sameMoney(p.amount, beforeAmounts.get(p.id) ?? 0));
  return amountsChanged ? [{ field: "payerAmounts" }] : [];
}

function splitChange(before: ExpenseSnapshot, after: ExpenseSnapshot): ActivityChange[] {
  const beforeById = new Map(before.participants.map((p) => [p.id, p]));
  const afterIds = new Set(after.participants.map((p) => p.id));
  const added = after.participants.filter((p) => !beforeById.has(p.id)).map((p) => p.name);
  const removed = before.participants.filter((p) => !afterIds.has(p.id)).map((p) => p.name);

  // An equal split's shares follow the amount and the people, which are
  // reported on their own. Otherwise compare what each remaining person was
  // given: percentages for a percentage split, amounts for a custom one.
  const shares: ShareChange[] = [];
  if (before.splitType === after.splitType && after.splitType !== "equal") {
    const unit = after.splitType === "percentage" ? "percent" : "amount";
    for (const p of after.participants) {
      const previous = beforeById.get(p.id);
      if (!previous) continue;
      const from = unit === "percent" ? previous.percent ?? 0 : previous.amount;
      const to = unit === "percent" ? p.percent ?? 0 : p.amount;
      if (!sameMoney(from, to)) shares.push({ name: p.name, from, to, unit });
    }
  }

  const typeChanged = before.splitType !== after.splitType;
  if (!typeChanged && !added.length && !removed.length && !shares.length) return [];
  return [
    {
      field: "split",
      fromType: before.splitType,
      toType: after.splitType,
      added,
      removed,
      sharesChanged: shares.length > 0,
      shares,
    },
  ];
}

/** Every field change from `before` to `after`, in display order. Empty when nothing changed. */
export function diffExpenseSnapshots(before: ExpenseSnapshot, after: ExpenseSnapshot): ActivityChange[] {
  const changes: ActivityChange[] = [];

  if (normalizeText(before.description) !== normalizeText(after.description)) {
    changes.push({ field: "description", from: before.description, to: after.description });
  }
  if (!sameMoney(before.amount, after.amount)) {
    changes.push({ field: "amount", from: before.amount, to: after.amount });
  }
  changes.push(...payerChanges(before, after), ...splitChange(before, after));
  if (before.date.slice(0, 10) !== after.date.slice(0, 10)) {
    changes.push({ field: "date", from: before.date.slice(0, 10), to: after.date.slice(0, 10) });
  }
  if (before.category !== after.category || before.subcategory !== after.subcategory) {
    changes.push({
      field: "category",
      from: { category: before.category, subcategory: before.subcategory },
      to: { category: after.category, subcategory: after.subcategory },
    });
  }
  const notesBefore = normalizeText(before.notes);
  const notesAfter = normalizeText(after.notes);
  if (notesBefore !== notesAfter) {
    changes.push({ field: "notes", action: !notesBefore ? "added" : !notesAfter ? "removed" : "updated" });
  }
  if (before.hasAttachment !== after.hasAttachment) {
    changes.push({ field: "attachment", action: after.hasAttachment ? "added" : "removed" });
  }
  return changes;
}
