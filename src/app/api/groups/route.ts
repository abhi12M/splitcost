import { NextResponse } from "next/server";
import { recordGroupCreated } from "@/lib/activity/server/recordGroupActivity";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateGroupInput } from "@/lib/validations/group.schema";
import { toSupportedCurrency, UNSUPPORTED_CURRENCY_ERROR } from "@/constants/currencies";

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
  const parsed = await readJsonObject(req, {
    allowedKeys: ["name", "currency", "memberNames"],
  });
  if (!parsed.ok) return parsed.response;

  const { name, currency, memberNames } = parsed.data;
  const normalizedCurrency = toSupportedCurrency(currency);
  const validation = validateGroupInput(name, memberNames);

  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  if (!normalizedCurrency) {
    return NextResponse.json({ error: UNSUPPORTED_CURRENCY_ERROR }, { status: 400 });
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

  return successJson(data, SUCCESS_MESSAGES.groupCreated);
}
