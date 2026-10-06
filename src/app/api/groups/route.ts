import { NextResponse } from "next/server";
import { recordGroupCreated } from "@/lib/activity/server/recordGroupActivity";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateGroupInput } from "@/lib/validations/group.schema";

export async function GET() {
  const { data, error } = await (supabaseAdmin as any).rpc("load_group_summaries", {
    p_group_ids: null,
  });

  if (error) {
    console.error("loadGroups error:", error);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 400 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const body: unknown = await req.json();
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { name, currency, memberNames } = body as Record<string, unknown>;
  const normalizedCurrency = typeof currency === "string" ? currency.trim() : "";
  const validation = validateGroupInput(name, memberNames);

  if (!normalizedCurrency || !validation.success) {
    return NextResponse.json({ error: validation.success ? "Invalid currency" : validation.error }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.rpc(
    "create_group_with_members",
    {
      group_name: validation.data.groupName,
      group_currency: normalizedCurrency,
      member_names: validation.data.memberNames,
    }
  );

  if (error) {
    console.error("createGroup error:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 400 }
    );
  }

  const createdId = (data as { id?: unknown } | null)?.id;
  if (typeof createdId === "string") {
    await recordGroupCreated(createdId, {
      name: validation.data.groupName,
      currency: normalizedCurrency,
      members: validation.data.memberNames,
    });
  }

  return NextResponse.json(data);
}
