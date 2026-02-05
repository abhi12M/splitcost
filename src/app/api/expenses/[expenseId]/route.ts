import { supabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
    splitType,
    category,
    subcategory,
    date,
    participants,
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
      p_paid_by_user_id: paidByUserId,
      p_split_type: splitType,
      p_category: category,
      p_subcategory: subcategory,
      p_date: date,
      p_participants: participants.map((p: any) => ({
        userId: p.userId,
        amount: p.amount,
        percent: p.percent ?? null,
      })),
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

  return NextResponse.json({
    group: {
      id: data.groups.id,
      name: data.groups.name,
      currency: data.groups.currency,
      members: data.groups.group_members.map((gm: any) => ({
        id: gm.users.id,
        name: gm.users.name,
      })),
    },
    expense: {
      id: data.id,
      amount: data.amount,
      description: data.description,
      currency: data.currency,
      paidByUserId: data.paid_by_user_id,
      splitType: data.split_type,
      category: data.category,
      subcategory: data.subcategory,
      date: data.date,
      participants: data.expense_participants.map((p: any) => ({
        userId: p.user_id,
        amount: p.share_amount,
        percent: p.share_percent,
      })),
    },
  });
}
