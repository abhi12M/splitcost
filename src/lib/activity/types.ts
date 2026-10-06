// Activity domain model, shared by the API (which records and serves events)
// and the UI (which presents them). Mirrors the `activity_events` table.
import type { SplitType } from "@/lib/storage";

export const ACTIVITY_KINDS = [
  "group_created",
  "group_renamed",
  "member_added",
  "member_renamed",
  "member_removed",
  "expense_added",
  "expense_updated",
  "expense_deleted",
  "settlement_added",
  "settlement_deleted",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export type ActivityPerson = { id: string; name: string };
export type ActivityShare = ActivityPerson & { amount: number };
export type ActivityCategory = { category: string; subcategory: string };

/** What a regular expense looked like when it was added or deleted. */
export type ExpenseSummary = {
  description: string;
  amount: number;
  currency: string;
  splitType: SplitType;
  payers: ActivityShare[];
  participants: ActivityShare[];
};

/** One person's share, before and after: an amount, or a percentage for percentage splits. */
export type ShareChange = { name: string; from: number; to: number; unit: "amount" | "percent" };

/** One field that changed in an expense update. Notes keep no text. */
export type ActivityChange =
  | { field: "description"; from: string; to: string }
  | { field: "amount"; from: number; to: number }
  | { field: "date"; from: string; to: string }
  /** `action` is missing on entries recorded before it existed; read as "updated". */
  | { field: "notes"; action?: "added" | "updated" | "removed" }
  | { field: "category"; from: ActivityCategory; to: ActivityCategory }
  | { field: "paidBy"; from: string[]; to: string[] }
  | { field: "payerAmounts" }
  | {
      field: "split";
      fromType: SplitType;
      toType: SplitType;
      added: string[];
      removed: string[];
      sharesChanged: boolean;
      /** Missing on entries recorded before it existed (only `sharesChanged` then). */
      shares?: ShareChange[];
    }
  | { field: "attachment"; action: "added" | "replaced" | "removed" };

export type SettlementSummary = { from: ActivityPerson; to: ActivityPerson; amount: number; currency: string };

export type ActivityData = {
  group_created: { name: string; currency: string; members: string[] };
  group_renamed: { from: string; to: string };
  member_added: { member: ActivityPerson };
  member_renamed: { memberId: string; from: string; to: string };
  member_removed: { member: ActivityPerson };
  expense_added: { expense: ExpenseSummary };
  expense_updated: { description: string; changes: ActivityChange[] };
  expense_deleted: { expense: ExpenseSummary };
  settlement_added: SettlementSummary;
  settlement_deleted: SettlementSummary;
};

type EventOf<K extends ActivityKind> = {
  id: string;
  groupId: string;
  expenseId: string | null;
  kind: K;
  data: ActivityData[K];
  /** Empty until the app has login. */
  actorName: string | null;
  createdAt: string;
};

/** Discriminated by `kind`, so `data` narrows with it. */
export type ActivityEvent = { [K in ActivityKind]: EventOf<K> }[ActivityKind];

/** An event before it is stored: the database assigns id and time. */
export type NewActivityEvent = {
  [K in ActivityKind]: {
    groupId: string;
    expenseId?: string | null;
    kind: K;
    data: ActivityData[K];
    originSessionId?: string | null;
  };
}[ActivityKind];

export type ActivityFilter = "all" | "expenses" | "settlements" | "members";

export const ACTIVITY_FILTER_KINDS: Record<Exclude<ActivityFilter, "all">, ActivityKind[]> = {
  expenses: ["expense_added", "expense_updated", "expense_deleted"],
  settlements: ["settlement_added", "settlement_deleted"],
  members: ["group_created", "group_renamed", "member_added", "member_renamed", "member_removed"],
};

export function isActivityFilter(value: unknown): value is ActivityFilter {
  return value === "all" || (typeof value === "string" && value in ACTIVITY_FILTER_KINDS);
}

/** Opaque "load more" position: the last event's time and id. */
export type ActivityCursor = { createdAt: string; id: string };

export type ActivityPage = { events: ActivityEvent[]; nextCursor: ActivityCursor | null };
