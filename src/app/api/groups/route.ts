import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("groups")
    .select(`
      id,
      name,
      currency,
      created_at,
      group_members (
        is_active,
        users ( name )
      ),
      expenses ( amount )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadGroups error:", error);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 400 });
  }

  const result = (data ?? []).map((group: any) => {
    const activeMembers = (group.group_members ?? []).filter((m: any) => m.is_active);
    const members = activeMembers
      .map((m: any) => m.users?.name)
      .filter((name: string | undefined): name is string => Boolean(name));

    const expenses = group.expenses ?? [];
    const totalExpenses = expenses.reduce(
      (sum: number, expense: { amount: number | null }) => sum + Number(expense.amount ?? 0),
      0
    );

    return {
      id: group.id,
      name: group.name,
      currency: group.currency,
      createdAt: group.created_at,
      members,
      memberCount: members.length,
      expenseCount: expenses.length,
      totalExpenses,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();

  const { name, currency, memberNames } = body;

  // 🔐 Basic validation / abuse protection
  if (!name || !currency || !Array.isArray(memberNames)) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }

  if (memberNames.length === 0 || memberNames.length > 20) {
    return NextResponse.json(
      { error: "Invalid number of members" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc(
    "create_group_with_members",
    {
      group_name: name,
      group_currency: currency,
      member_names: memberNames,
    }
  );

  if (error) {
    console.error("createGroup error:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 400 }
    );
  }

  return NextResponse.json(data);
}
