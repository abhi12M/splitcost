import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

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
        amount
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

  const result = (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    currency: row.currency,
    createdAt: row.created_at,
    expenses: row.expenses,
    members: row.group_members.map((gm: any) => gm.user.name),
  }));

  return NextResponse.json(result);
}
