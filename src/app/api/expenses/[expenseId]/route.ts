import {
  recordExpenseChanges,
  recordExpenseDeleted,
  recordExpenseEdited,
} from "@/lib/activity/server/recordExpenseActivity";
import { loadExpenseSnapshot } from "@/lib/activity/server/expenseSnapshots";
import { isSettlement, SETTLEMENT_CATEGORY } from "@/lib/activity/expenseSnapshot";
import { broadcastExpenseChange } from "@/lib/api/broadcastExpense";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  EXPENSE_CATEGORIES,
  type CategoryKey,
  type SubcategoryId,
} from "@/components/icons/CategoryIcons";
import { NextResponse } from "next/server";
import {
  getStoragePathFromValue,
  resolveExpenseAttachmentPayload,
} from "@/lib/supabase/attachments";
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

type ParticipantPayload = {
  userId: string;
  amount: number | null;
  percent: number | null;
};

type GroupMemberRow = {
  users: {
    id: string;
    name: string;
  };
};

type ExpensePayerRow = {
  user_id: string;
  amount: number | string;
};

type ExpenseParticipantRow = {
  user_id: string;
  share_amount: number | null;
  share_percent: number | null;
};

type ExpenseDetailsRow = {
  id: string;
  description: string;
  notes: string | null;
  amount: number | string;
  currency: string;
  paid_by_user_id: string | null;
  split_type: string;
  category: CategoryKey;
  subcategory: SubcategoryId;
  date: string;
  created_at: string;
  updated_at: string | null;
  revision: number;
  attachment_data_url: string | null;
  expense_participants: ExpenseParticipantRow[];
  groups: {
    id: string;
    name: string;
    currency: string;
    revision: number;
    group_members: GroupMemberRow[];
  };
};

export async function PUT(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;
  const parsed = await readJsonObject(req, {
    allowedKeys: [
      "groupId", "description", "notes", "amount", "currency",
      "paidByUserId", "payers", "splitType", "category", "subcategory",
      "date", "participants", "attachmentDataUrl", "expectedRevision",
      "originSessionId",
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
    attachmentDataUrl,
    expectedRevision,
    originSessionId,
  } = body;

  const fail = (error: string) => NextResponse.json({ error }, { status: 400 });

  if (!isValidUUID(groupId)) return fail("Invalid group ID");
  if (!isValidUUID(expenseId)) return fail("Invalid expense ID");

  const descriptionResult = validateExpenseDescription(description);
  if (!descriptionResult.success) {
    return NextResponse.json({ error: descriptionResult.error }, { status: 400 });
  }

  const amountError = validateAmount(amount);
  if (amountError) return fail(amountError);

  if (!Number.isSafeInteger(expectedRevision)) return fail("Invalid expected revision");

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

  const session = typeof originSessionId === "string" ? originSessionId.slice(0, 128) : null;
  // Read before saving: the save is revision-checked, so when it succeeds this
  // is exactly the state it replaced.
  const before = await loadExpenseSnapshot(expenseId);

  const { data, error } = await supabaseAdmin.rpc(
    "edit_expense",
    {
      p_group_id: groupId,
      p_expense_id: expenseId,
      p_description: descriptionResult.data,
      p_amount: amount,
      p_currency: currencyResult.currency,
      p_paid_by_user_id: paidByUserId || null,
      p_split_type: splitType,
      p_category: category,
      p_subcategory: subcategory,
      p_date: date,
      p_participants: participants.map((p: ParticipantPayload) => ({
        userId: p.userId,
        amount: p.amount,
        percent: p.percent ?? null,
      })),
      p_payers: payers || null,
      p_notes: typeof notes === "string" ? normalizeExpenseNotes(notes) || null : null,
      p_expected_revision: expectedRevision,
    }
  );

  if (error || !data) {
    console.error("updateExpense error:", error);
    if (error?.message === "EXPENSE_DELETED") {
      return NextResponse.json({ code: "EXPENSE_DELETED", expenseId }, { status: 404 });
    }
    if (error?.message?.startsWith("EXPENSE_VERSION_CONFLICT:")) {
      const latest = await supabaseAdmin
        .from("expenses")
        .select("revision")
        .eq("id", expenseId)
        .maybeSingle();
      return NextResponse.json(
        {
          code: "EXPENSE_VERSION_CONFLICT",
          expenseId,
          expectedRevision,
          currentRevision: latest.data?.revision ?? null,
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 400 }
    );
  }

  const row = data[0];

  const after = await loadExpenseSnapshot(expenseId);
  if (before && after) await recordExpenseEdited(before, after, session);
  broadcastExpenseChange({ event: "UPDATE", expenseId, groupId, originSessionId: session, revision: row.revision });

  return successJson(
    {
      id: row.id,
      groupId: row.group_id,
      description: row.description,
      notes: row.notes,
      amount: Number(row.amount),
      currency: row.currency,
      paidBy: {
        id: row.paid_by_user_id,
        name: row.paid_by_name,
      },
      splitType: row.split_type,
      category: row.category,
      subcategory: row.subcategory,
      date: String(row.date),
      participants: row.participants,
      attachmentDataUrl,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      revision: row.revision,
    },
    row.category === SETTLEMENT_CATEGORY ? SUCCESS_MESSAGES.settlementUpdated : SUCCESS_MESSAGES.expenseUpdated
  );
}

export async function DELETE(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;

  if (!isValidUUID(expenseId)) {
    return NextResponse.json(
      { error: "Invalid expense ID" },
      { status: 400 }
    );
  }

  const parsed2 = await readJsonObject(req, { allowedKeys: ["originSessionId"] });
  const session = parsed2.ok && typeof parsed2.data.originSessionId === "string"
    ? parsed2.data.originSessionId.slice(0, 128)
    : null;
  // The deleted expense's last state is what the activity entry shows.
  const deleted = await loadExpenseSnapshot(expenseId);
  const { data, error } = await supabaseAdmin.rpc("delete_expense", {
    p_expense_id: expenseId,
  });

  if (error || !data) {
    console.error("deleteExpense error:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: error ? 400 : 404 }
    );
  }

  if (deleted) {
    await recordExpenseDeleted(deleted, session);
    broadcastExpenseChange({ event: "DELETE", expenseId, groupId: deleted.groupId, originSessionId: session });
  }
  return successJson(
    { success: true },
    deleted && isSettlement(deleted) ? SUCCESS_MESSAGES.settlementDeleted : SUCCESS_MESSAGES.expenseDeleted
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;

  if (!isValidUUID(expenseId)) {
    return NextResponse.json(
      { error: "Invalid expense ID" },
      { status: 400 }
    );
  }

  const parsed = await readJsonObject(req, {
    allowedKeys: ["category", "subcategory", "originSessionId"],
  });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const category = body?.category as CategoryKey | undefined;
  const subcategory = body?.subcategory as SubcategoryId | undefined;
  const originSessionId =
    typeof body?.originSessionId === "string" ? body.originSessionId.slice(0, 128) : null;

  if (!category || !subcategory) {
    return NextResponse.json(
      { error: "Category and subcategory are required" },
      { status: 400 }
    );
  }

  const categoryConfig = EXPENSE_CATEGORIES[category];
  const hasValidSubcategory = categoryConfig?.subcategories.some(
    (item) => item.id === subcategory
  );

  if (!categoryConfig || !hasValidSubcategory) {
    return NextResponse.json(
      { error: "Invalid category selection" },
      { status: 400 }
    );
  }

  const before = await loadExpenseSnapshot(expenseId);
  const { data, error } = await supabaseAdmin.rpc("set_expense_category", {
    p_expense_id: expenseId,
    p_category: category,
    p_subcategory: subcategory,
  });

  const row = data?.[0];

  if (error || !row) {
    console.error("patchExpenseCategory error:", error);
    const isProduction = process.env.NODE_ENV === "production";
    return NextResponse.json(
      {
        error: isProduction
          ? "We could not update the expense category. Please try again. If the problem persists, contact support."
          : error?.message || "Failed to update expense category",
        code: error?.code,
        details: isProduction ? undefined : error?.details,
      },
      { status: 400 }
    );
  }

  if (before && (before.category !== row.category || before.subcategory !== row.subcategory)) {
    await recordExpenseChanges(
      { ...before, category: row.category, subcategory: row.subcategory },
      [
        {
          field: "category",
          from: { category: before.category, subcategory: before.subcategory },
          to: { category: row.category, subcategory: row.subcategory },
        },
      ],
      originSessionId
    );
  }
  broadcastExpenseChange({ event: "UPDATE", expenseId, groupId: row.group_id, originSessionId, revision: row.revision });

  return successJson(
    {
      id: row.id,
      groupId: row.group_id,
      category: row.category,
      subcategory: row.subcategory,
      updatedAt: row.updated_at,
      revision: row.revision,
    },
    SUCCESS_MESSAGES.categoryUpdated
  );
}

export async function GET(
  _req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;

  if (!isValidUUID(expenseId)) {
    return NextResponse.json({ error: "Invalid expense ID" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select(`
      id,
      description,
      notes,
      amount,
      currency,
      paid_by_user_id,
      split_type,
      category,
      subcategory,
      date,
      created_at,
      updated_at,
      revision,
      attachment_data_url,
      expense_participants (
        user_id,
        share_amount,
        share_percent
      ),
      groups (
        id,
        name,
        currency,
        revision,
        group_members (
          users (
            id,
            name
          )
        )
      )
    `)
    .eq("id", expenseId)
    .single();

  if (error || !data) {
    console.error("Error loading expense:", error);
    return NextResponse.json(null, { status: 404 });
  }

  const expenseRow = data as unknown as ExpenseDetailsRow;
  const attachmentValue = expenseRow.attachment_data_url as string | null;
  const attachmentPath = getStoragePathFromValue(attachmentValue);

  // Fan out the payers query and the (optional) attachment payload in parallel
  // so the GET responds in a single round-trip with everything the view / edit
  // pages need. Previously the client had to make a separate request to
  // /api/expenses/:id/attachment after this one returned.
  const [payersResult, attachmentResolution] = await Promise.all([
    supabaseAdmin
      .from("expense_payers")
      .select(`
        amount,
        user_id,
        users (
          id,
          name
        )
      `)
      .eq("expense_id", expenseId),
    resolveExpenseAttachmentPayload(expenseId, attachmentPath),
  ]);
  const attachmentDataUrl =
    attachmentResolution.status === "missing" ? null : expenseRow.attachment_data_url;

  const payersData = payersResult.data;

  return NextResponse.json({
    group: {
      id: expenseRow.groups.id,
      name: expenseRow.groups.name,
      currency: expenseRow.groups.currency,
      // Lets the screen tell which realtime group changes this snapshot
      // already includes (read in the same query as the members).
      revision: expenseRow.groups.revision,
      members: expenseRow.groups.group_members.map((gm) => ({
        id: gm.users.id,
        name: gm.users.name,
      })),
    },
    expense: {
      id: expenseRow.id,
      amount: expenseRow.amount,
      description: expenseRow.description,
      notes: expenseRow.notes,
      currency: expenseRow.currency,
      paidByUserId: expenseRow.paid_by_user_id,
      payers: payersData?.map((p: ExpensePayerRow) => ({
        userId: p.user_id,
        amount: Number(p.amount),
      })) || [],
      splitType: expenseRow.split_type,
      category: expenseRow.category,
      subcategory: expenseRow.subcategory,
      date: expenseRow.date,
      createdAt: expenseRow.created_at,
      updatedAt: expenseRow.updated_at,
      revision: expenseRow.revision,
      attachmentDataUrl,
      attachment: attachmentResolution.attachment,
      participants: expenseRow.expense_participants.map((p: ExpenseParticipantRow) => ({
        userId: p.user_id,
        amount: p.share_amount,
        percent: p.share_percent,
      })),
    },
  });
}
