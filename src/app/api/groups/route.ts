import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

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
