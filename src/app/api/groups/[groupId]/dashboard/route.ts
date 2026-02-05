import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { groupId: string } }
) {
  const groupId = params.groupId;

  if (!groupId) {
    return NextResponse.json(null, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("groups")
    .select(`
    id,
    name,
    currency,
    created_at,
    expenses (
      id,
      description,
      amount,
      currency,
      users!expenses_paid_by_user_id_fkey (
        id,
        name
      ),
      split_type,
      category,
      subcategory,
      date,
      created_at,
      expense_participants (
        users (
          id,
          name
        ),
        share_amount,
        share_percent
      )
    ),
    group_members (
      is_active,
      users (
        id,
        name
      )
    )
  `)
    .eq("id", groupId)
    .single();

  const members = data?.group_members
    .filter((gm: any) => gm.is_active)
    .map((gm: any) => ({
      id: gm.users.id,
      name: gm.users.name,
    }));


  if (error || !data) {
    console.error("loadGroupDetails error:", error);
    return NextResponse.json(null, { status: 404 });
  }

  const response = {
    group: {
      id: data.id,
      name: data.name,
      currency: data.currency,
      createdAt: data.created_at,
      members: members
    },
    expenses: (data.expenses || []).map((e: any) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      currency: e.currency,
      paidBy: {
        id: e.users.id,
        name: e.users.name,
      },
      splitType: e.split_type,
      category: e.category,
      subcategory: e.subcategory,
      date: String(e.date),
      createdAt: e.created_at,
      participants: e.expense_participants.map((p: any) => ({
        user: {
          id: p.users.id,
          name: p.users.name,
        },
        amount: p.share_amount,
        percent: p.share_percent,
      })),
    })),
  };

  return NextResponse.json(response);
}
