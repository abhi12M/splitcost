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

  const { data, error } = await (supabaseAdmin as any).rpc("load_group_summaries", {
    p_group_ids: groupIds,
  });

  if (error) {
    console.error("loadGroupsByIds error:", error);
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
