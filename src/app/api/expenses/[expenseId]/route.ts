import { supabaseAdmin } from "@/lib/supabase/server";
import {
  EXPENSE_CATEGORIES,
  type CategoryKey,
  type SubcategoryId,
} from "@/components/icons/CategoryIcons";
import { NextResponse } from "next/server";

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

export async function PUT(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;
  const body = await req.json();

  const {
    groupId,
    description,
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
  } = body;

  // 🔐 Basic validation / abuse protection
  if (!groupId || !expenseId || !description || !amount) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }

  if (participants?.length > 50) {
    return NextResponse.json(
      { error: "Too many participants" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc(
    "edit_expense",
    {
      p_group_id: groupId,
      p_expense_id: expenseId,
      p_description: description,
      p_amount: amount,
      p_currency: currency,
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
    }
  );

  if (error || !data) {
    console.error("updateExpense error:", error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 400 }
    );
  }

  const row = data[0];

  return NextResponse.json({
    id: row.id,
    groupId: row.group_id,
    description: row.description,
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
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;

  if (!expenseId) {
    return NextResponse.json(
      { error: "Missing expenseId" },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("expenses")
    .delete()
    .eq("id", expenseId);

  if (error) {
    console.error("deleteExpense error:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;

  if (!expenseId) {
    return NextResponse.json(
      { error: "Missing expenseId" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const category = body?.category as CategoryKey | undefined;
  const subcategory = body?.subcategory as SubcategoryId | undefined;

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

  const { data, error } = await supabaseAdmin
    .from("expenses")
    .update({
      category,
      subcategory,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId)
    .select(`
      id,
      group_id,
      category,
      subcategory,
      updated_at
    `)
    .single();

  if (error || !data) {
    console.error("patchExpenseCategory error:", error);
    return NextResponse.json(
      { error: "Failed to update expense category" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    id: data.id,
    groupId: data.group_id,
    category: data.category,
    subcategory: data.subcategory,
    updatedAt: data.updated_at,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;

  if (!expenseId) {
    return NextResponse.json(null, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select(`
      id,
      description,
      amount,
      currency,
      paid_by_user_id,
      split_type,
      category,
      subcategory,
      date,
      created_at,
      updated_at,
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

  const expenseRow = data as any;

  // Fetch payers from expense_payers table
  const { data: payersData } = await supabaseAdmin
    .from("expense_payers")
    .select(`
      amount,
      user_id,
      users (
        id,
        name
      )
    `)
    .eq("expense_id", expenseId);

  return NextResponse.json({
    group: {
      id: data.groups.id,
      name: data.groups.name,
      currency: data.groups.currency,
      members: data.groups.group_members.map((gm: GroupMemberRow) => ({
        id: gm.users.id,
        name: gm.users.name,
      })),
    },
    expense: {
      id: expenseRow.id,
      amount: expenseRow.amount,
      description: expenseRow.description,
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
      attachmentDataUrl: expenseRow.attachment_data_url,
      participants: expenseRow.expense_participants.map((p: ExpenseParticipantRow) => ({
        userId: p.user_id,
        amount: p.share_amount,
        percent: p.share_percent,
      })),
    },
  });
}
