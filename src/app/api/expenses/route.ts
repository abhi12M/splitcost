import { recordExpenseAdded } from "@/lib/activity/server/recordExpenseActivity";
import { loadExpenseSnapshot } from "@/lib/activity/server/expenseSnapshots";
import { SETTLEMENT_CATEGORY } from "@/lib/activity/expenseSnapshot";
import { broadcastExpenseChange } from "@/lib/api/broadcastExpense";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  EXPENSE_NOTES_STORAGE_MAX,
  normalizeExpenseNotes,
} from "@/lib/expenseNotes";
import { validateExpenseDescription } from "@/lib/validations/expense.schema";
import { resolveExpenseCurrency } from "@/lib/api/expenseCurrency";
import {
  isValidUUID,
  validateAmount,
  validateSplitType,
  validateCategory,
  validateExpenseDate,
  validateParticipants,
  validatePayers,
  validateGroupMembership,
} from "@/lib/api/expenseValidation";

export async function POST(req: Request) {
  const parsed = await readJsonObject(req, {
    allowedKeys: [
      "groupId", "description", "notes", "amount", "currency",
      "paidByUserId", "payers", "splitType", "category", "subcategory",
      "date", "participants", "originSessionId",
    ],
  });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const {
    groupId,
    description,
    notes,
    amount,
    currency,
    paidByUserId,
    payers,
    splitType,
    category,
    subcategory,
    date,
    participants,
    originSessionId,
  } = body;

  const fail = (error: string) => NextResponse.json({ error }, { status: 400 });

  if (!isValidUUID(groupId)) return fail("Invalid group ID");

  const descriptionResult = validateExpenseDescription(description);
  if (!descriptionResult.success) {
    return NextResponse.json({ error: descriptionResult.error }, { status: 400 });
  }

  const amountError = validateAmount(amount);
  if (amountError) return fail(amountError);

  const hasSinglePayer = paidByUserId != null && paidByUserId !== "";
  const hasMultiplePayers = Array.isArray(payers) && payers.length > 0;
  if (!hasSinglePayer && !hasMultiplePayers) return fail("A payer is required");
  if (hasSinglePayer && hasMultiplePayers) return fail("Cannot have both paidByUserId and payers");
  if (hasSinglePayer && !isValidUUID(paidByUserId)) return fail("Invalid payer user ID");

  const splitTypeError = validateSplitType(splitType);
  if (splitTypeError) return fail(splitTypeError);

  const categoryError = validateCategory(category, subcategory);
  if (categoryError) return fail(categoryError);

  const dateError = validateExpenseDate(date);
  if (dateError) return fail(dateError);

  const participantsError = validateParticipants(participants, splitType, amount);
  if (participantsError) return fail(participantsError);

  const payersError = validatePayers(payers, amount);
  if (payersError) return fail(payersError);

  if (typeof notes === "string" && notes.length > EXPENSE_NOTES_STORAGE_MAX) {
    return fail("Notes are too long");
  }

  const currencyResult = await resolveExpenseCurrency(groupId, currency);
  if (!currencyResult.ok) return currencyResult.response;

  const membershipError = await validateGroupMembership(
    groupId, paidByUserId, participants, payers ?? null,
  );
  if (membershipError) return fail(membershipError);

  const { data, error } = await supabaseAdmin.rpc("add_expense", {
    p_group_id: groupId,
    p_description: descriptionResult.data,
    p_amount: amount,
    p_currency: currencyResult.currency,
    p_paid_by_user_id: paidByUserId || null,
    p_split_type: splitType,
    p_category: category,
    p_subcategory: subcategory,
    p_date: date,
    p_participants: participants,
    p_payers: payers || null,
    p_notes: typeof notes === "string" ? normalizeExpenseNotes(notes) || null : null,
  });

  if (error) {
    console.error("addExpense error:", error);
    // A deleted group is a specific, permanent failure; say so, so the
    // client can explain it instead of suggesting a retry.
    const { data: group } = await supabaseAdmin.from("groups").select("id").eq("id", groupId).maybeSingle();
    if (!group) {
      return NextResponse.json({ code: "GROUP_NOT_FOUND", error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to add expense" },
      { status: 400 }
    );
  }
  const createdId = (data as { id?: unknown } | null)?.id;
  const session = typeof originSessionId === "string" ? originSessionId.slice(0, 128) : null;
  const created = typeof createdId === "string" ? await loadExpenseSnapshot(createdId) : null;
  if (created) {
    await recordExpenseAdded(created, session);
  }
  if (typeof createdId === "string") {
    broadcastExpenseChange({ event: "INSERT", expenseId: createdId, groupId, originSessionId: session });
  }
  return successJson(
    data,
    category === SETTLEMENT_CATEGORY ? SUCCESS_MESSAGES.settlementRecorded : SUCCESS_MESSAGES.expenseAdded
  );
}
