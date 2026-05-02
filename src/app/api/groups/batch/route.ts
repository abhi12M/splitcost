import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type BatchExpenseRow = {
  amount: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function getLatestExpenseActivityAt(expenses: BatchExpenseRow[]) {
  return expenses.reduce<string | null>((latest, expense) => {
    const candidate = expense.updated_at ?? expense.created_at ?? null;

    if (!candidate) {
      return latest;
    }

    if (!latest) {
      return candidate;
    }

    return new Date(candidate).getTime() > new Date(latest).getTime()
      ? candidate
      : latest;
  }, null);
}

export async function POST(req: Request) {
  const { groupIds } = await req.json();

  // 🔐 Basic abuse protection
  if (!Array.isArray(groupIds) || groupIds.length === 0) {
    return NextResponse.json([]);
  }

  if (groupIds.length > 20) {
    return NextResponse.json(
      { error: "Too many groups requested" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("groups")
    .select(`
      id,
      name,
      currency,
      created_at,
      expenses (
        amount,
        created_at,
        updated_at
      ),
      group_members!inner (
        user:users (
          id,
          name
        )
      )
    `)
    .in("id", groupIds)
    .eq("group_members.is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("loadGroupsByIds error:", error);
    return NextResponse.json([], { status: 500 });
  }

  const result = (data || []).map((row: any) => {
    const expenses = (row.expenses ?? []).map((expense: BatchExpenseRow) => ({
      amount: Number(expense.amount ?? 0),
      createdAt: expense.created_at ?? null,
      updatedAt: expense.updated_at ?? null,
    }));

    return {
      id: row.id,
      name: row.name,
      currency: row.currency,
      createdAt: row.created_at,
      expenses,
      members: row.group_members.map((gm: any) => gm.user.name),
      latestExpenseActivityAt: getLatestExpenseActivityAt(row.expenses ?? []),
    };
  });

  result.sort((a, b) => {
    const aTime = new Date(
      a.latestExpenseActivityAt ?? a.createdAt
    ).getTime();
    const bTime = new Date(
      b.latestExpenseActivityAt ?? b.createdAt
    ).getTime();

    return bTime - aTime;
  });

  return NextResponse.json(result);
}
