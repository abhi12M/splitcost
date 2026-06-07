import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
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
  } = body;

  // 🔐 Basic abuse protection
  const hasPayer = paidByUserId || (payers && payers.length);
  if (!groupId || !description || !amount || !hasPayer) {
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

  const { data, error } = await supabaseAdmin.rpc("add_expense", {
    p_group_id: groupId,
    p_description: description,
    p_amount: amount,
    p_currency: currency,
    p_paid_by_user_id: paidByUserId || null,
    p_split_type: splitType,
    p_category: category,
    p_subcategory: subcategory,
    p_date: date,
    p_participants: participants,
    p_payers: payers || null,
  });

  if (error) {
    console.error("addExpense error:", error);
    return NextResponse.json(
      { error: "Failed to add expense" },
      { status: 400 }
    );
  }

  return NextResponse.json(data);
}
