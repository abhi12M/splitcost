import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { recordActivity } from "@/lib/activity/server/activityStore";
import {
  isSettlement,
  toExpenseSummary,
  toSettlementSummary,
  type ExpenseSnapshot,
} from "@/lib/activity/expenseSnapshot";
import type { NewActivityEvent } from "@/lib/activity/types";
import {
  isValidUUID,
  validateAmount,
  validateCategory,
  validateExpenseDate,
  validateParticipants,
  validatePayers,
  validateSplitType,
} from "@/lib/api/expenseValidation";
import { errorJson } from "@/lib/api/errors";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { EXPENSE_NOTES_STORAGE_MAX, normalizeExpenseNotes } from "@/lib/expenseNotes";
import type { SplitType } from "@/lib/storage";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateExpenseDescription } from "@/lib/validations/expense.schema";
import { validateGroupInput } from "@/lib/validations/group.schema";
import { toSupportedCurrency, UNSUPPORTED_CURRENCY_ERROR } from "@/constants/currencies";

// POST /api/groups/import — saves a group created offline on a device, with
// its members and expenses, in one transaction. Ids come from the device so
// its links keep working. Resending the same group is safe: see the
// import_local_group migration.

// Matches the import's limit in middleware.ts.
const MAX_IMPORT_BODY_BYTES = 1_000_000;
const MAX_IMPORT_EXPENSES = 1_000;

type Participant = { userId: string; amount: number | null; percent: number | null };
type Payer = { userId: string; amount: number };

type CleanExpense = {
  id: string;
  description: string;
  notes: string | null;
  amount: number;
  paidByUserId: string | null;
  payers: Payer[];
  splitType: SplitType;
  category: string;
  subcategory: string;
  date: string;
  participants: Participant[];
  createdAt: string | null;
  updatedAt: string | null;
};

function rejected(error: string) {
  return NextResponse.json({ code: "IMPORT_REJECTED", error }, { status: 400 });
}

function conflict() {
  return NextResponse.json({ code: "IMPORT_CONFLICT", error: "This group can't be imported." }, { status: 409 });
}

/**
 * The device's time as ISO, or null when it isn't one. Kept as sent (not
 * capped at now) so a resend hashes the same; the database caps it.
 */
function deviceTime(value: unknown): string | null {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

/** For activity: the device's time, never in the future. */
function pastTime(value: string | null) {
  const now = Date.now();
  return new Date(value ? Math.min(Date.parse(value), now) : now).toISOString();
}

function cleanExpense(raw: unknown, memberIds: Set<string>): CleanExpense | string {
  if (!raw || typeof raw !== "object") return "Invalid expense";
  const e = raw as Record<string, unknown>;
  if (!isValidUUID(e.id)) return "Invalid expense ID";

  const description = validateExpenseDescription(e.description);
  if (!description.success) return description.error;

  const amountError = validateAmount(e.amount);
  if (amountError) return amountError;
  const amount = e.amount as number;

  const payers = Array.isArray(e.payers) ? e.payers : [];
  const paidByUserId = typeof e.paidByUserId === "string" && e.paidByUserId ? e.paidByUserId : null;
  if (!paidByUserId && payers.length === 0) return "A payer is required";
  if (paidByUserId && payers.length > 0) return "Cannot have both paidByUserId and payers";
  if (paidByUserId && !isValidUUID(paidByUserId)) return "Invalid payer user ID";

  const splitTypeError = validateSplitType(e.splitType);
  if (splitTypeError) return splitTypeError;
  const categoryError = validateCategory(e.category, e.subcategory);
  if (categoryError) return categoryError;
  const dateError = validateExpenseDate(e.date);
  if (dateError) return dateError;
  const participantsError = validateParticipants(e.participants, e.splitType as string, amount);
  if (participantsError) return participantsError;
  const payersError = validatePayers(payers.length ? payers : null, amount);
  if (payersError) return payersError;

  if (e.notes !== null && e.notes !== undefined && typeof e.notes !== "string") return "Invalid notes";
  if (typeof e.notes === "string" && e.notes.length > EXPENSE_NOTES_STORAGE_MAX) return "Notes are too long";

  const participants = (e.participants as Record<string, unknown>[]).map((p) => ({
    userId: p.userId as string,
    amount: typeof p.amount === "number" ? p.amount : null,
    percent: typeof p.percent === "number" ? p.percent : null,
  }));
  const cleanPayers = (payers as Record<string, unknown>[]).map((p) => ({
    userId: p.userId as string,
    amount: p.amount as number,
  }));

  // The members are the ones in this same import, so check against them.
  if (paidByUserId && !memberIds.has(paidByUserId)) return "Payer is not a member of this group";
  if (participants.some((p) => !memberIds.has(p.userId))) return "A participant is not a member of this group";
  if (cleanPayers.some((p) => !memberIds.has(p.userId))) return "A payer is not a member of this group";

  return {
    id: e.id as string,
    description: description.data,
    notes: typeof e.notes === "string" ? normalizeExpenseNotes(e.notes) || null : null,
    amount,
    paidByUserId,
    payers: cleanPayers,
    splitType: e.splitType as SplitType,
    category: e.category as string,
    subcategory: e.subcategory as string,
    date: e.date as string,
    participants,
    createdAt: deviceTime(e.createdAt),
    updatedAt: deviceTime(e.updatedAt ?? e.createdAt),
  };
}

function activityFor(
  groupId: string,
  group: { name: string; currency: string; createdAt: string | null; members: { id: string; name: string }[] },
  expenses: CleanExpense[]
): NewActivityEvent[] {
  const names = new Map(group.members.map((member) => [member.id, member.name]));
  const events: NewActivityEvent[] = [
    {
      groupId,
      kind: "group_created",
      data: { name: group.name, currency: group.currency, members: group.members.map((member) => member.name) },
      createdAt: pastTime(group.createdAt),
    },
  ];
  for (const expense of expenses) {
    const snapshot: ExpenseSnapshot = {
      id: expense.id,
      groupId,
      description: expense.description,
      amount: expense.amount,
      currency: group.currency,
      date: expense.date,
      notes: expense.notes,
      category: expense.category,
      subcategory: expense.subcategory,
      splitType: expense.splitType,
      payers: expense.payers.length
        ? expense.payers.map((p) => ({ id: p.userId, name: names.get(p.userId) ?? "", amount: p.amount }))
        : expense.paidByUserId
          ? [{ id: expense.paidByUserId, name: names.get(expense.paidByUserId) ?? "", amount: expense.amount }]
          : [],
      participants: expense.participants.map((p) => ({
        id: p.userId,
        name: names.get(p.userId) ?? "",
        amount: p.amount ?? 0,
        percent: p.percent,
      })),
      hasAttachment: false,
    };
    events.push(
      isSettlement(snapshot)
        ? { groupId, expenseId: expense.id, kind: "settlement_added", data: toSettlementSummary(snapshot), createdAt: pastTime(expense.createdAt) }
        : { groupId, expenseId: expense.id, kind: "expense_added", data: { expense: toExpenseSummary(snapshot) }, createdAt: pastTime(expense.createdAt) }
    );
  }
  return events;
}

export async function POST(req: Request) {
  const parsed = await readJsonObject(req, {
    maxBytes: MAX_IMPORT_BODY_BYTES,
    allowedKeys: ["id", "name", "currency", "createdAt", "members", "expenses"],
  });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  if (!isValidUUID(body.id)) return rejected("Invalid group ID");
  const groupId = body.id as string;

  if (!Array.isArray(body.members)) return rejected("Invalid members");
  const rawMembers = body.members as unknown[];
  if (!rawMembers.every((m) => m && typeof m === "object" && isValidUUID((m as { id?: unknown }).id))) {
    return rejected("Invalid member ID");
  }
  const memberIds = rawMembers.map((m) => (m as { id: string }).id);
  if (new Set(memberIds).size !== memberIds.length) return rejected("Duplicate member ID");

  const validation = validateGroupInput(
    body.name,
    rawMembers.map((m) => (m as { name?: unknown }).name)
  );
  if (!validation.success) return rejected(validation.error);

  const currency = toSupportedCurrency(body.currency);
  if (!currency) return NextResponse.json({ code: "IMPORT_REJECTED", error: UNSUPPORTED_CURRENCY_ERROR }, { status: 400 });

  if (!Array.isArray(body.expenses)) return rejected("Invalid expenses");
  if (body.expenses.length > MAX_IMPORT_EXPENSES) return rejected("This group has too many expenses to sync at once.");

  const members = memberIds.map((id, index) => ({ id, name: validation.data.memberNames[index] }));
  const memberIdSet = new Set(memberIds);
  const expenses: CleanExpense[] = [];
  const expenseIds = new Set<string>();
  for (const raw of body.expenses as unknown[]) {
    const result = cleanExpense(raw, memberIdSet);
    if (typeof result === "string") {
      const description = (raw as { description?: unknown })?.description;
      return rejected(typeof description === "string" && description ? `"${description}": ${result}` : result);
    }
    if (expenseIds.has(result.id)) return rejected("Duplicate expense ID");
    expenseIds.add(result.id);
    expenses.push(result);
  }

  const group = {
    name: validation.data.groupName,
    currency,
    createdAt: deviceTime(body.createdAt),
    members,
  };

  // The hash covers exactly what is saved, built in a fixed shape, so a resend
  // of the same snapshot always produces the same value.
  const payloadHash = createHash("sha256")
    .update(JSON.stringify({ id: groupId, ...group, expenses }))
    .digest("hex");

  // Not in the generated database types yet.
  const rpc = supabaseAdmin.rpc.bind(supabaseAdmin) as unknown as (
    fn: "import_local_group",
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  const { data, error } = await rpc("import_local_group", {
    p_group_id: groupId,
    p_payload_hash: payloadHash,
    p_name: group.name,
    p_currency: currency,
    p_created_at: group.createdAt,
    p_members: members,
    p_expenses: expenses,
  });

  if (error) {
    // An id already in use (the import's own, or a member's / expense's).
    if (error.message?.includes("IMPORT_CONFLICT") || error.code === "23505") return conflict();
    console.error("importLocalGroup error:", error);
    return errorJson("Failed to import group", 500, error);
  }

  const status = data === "already_imported" ? "already_imported" : "created";
  // A repeat already recorded its activity the first time.
  if (status === "created") await recordActivity(activityFor(groupId, group, expenses));

  return successJson({ id: groupId, status, revision: 1 }, SUCCESS_MESSAGES.groupCreated);
}
