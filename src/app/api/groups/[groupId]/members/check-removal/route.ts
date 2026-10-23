import { NextResponse } from "next/server";

import { isValidUUID } from "@/lib/api/expenseValidation";
import { readJsonObject } from "@/lib/api/request";
import { cleanName } from "@/lib/validations/names";
import { supabaseAdmin } from "@/lib/supabase/server";

async function isMemberInvolvedInGroupExpenses(groupId: string, userId: string) {
  const [{ data: paidExpenses, error: paidError }, { data: participantExpenses, error: participantError }] =
    await Promise.all([
      supabaseAdmin
        .from("expenses")
        .select("id")
        .eq("group_id", groupId)
        .eq("paid_by_user_id", userId)
        .limit(1),
      supabaseAdmin
        .from("expense_participants")
        .select(`
          expense_id,
          expenses!inner ( group_id )
        `)
        .eq("user_id", userId)
        .eq("expenses.group_id", groupId)
        .limit(1),
    ]);

  if (paidError) {
    throw paidError;
  }

  if (participantError) {
    throw participantError;
  }

  return Boolean((paidExpenses ?? []).length || (participantExpenses ?? []).length);
}

export async function POST(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  const groupId = params.groupId;
  const parsed = await readJsonObject(req, { allowedKeys: ["memberId", "memberName"] });
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const memberId = String(body?.memberId ?? "").trim();
  const memberName = cleanName(String(body?.memberName ?? ""));

  if (!isValidUUID(groupId)) {
    return NextResponse.json(
      { error: "Invalid group ID" },
      { status: 400 }
    );
  }

  if (!memberId && !memberName) {
    return NextResponse.json(
      { error: "Member details are required." },
      { status: 400 }
    );
  }

  if (memberId && !isValidUUID(memberId)) {
    return NextResponse.json(
      { error: "Invalid member ID" },
      { status: 400 }
    );
  }

  let query = supabaseAdmin
    .from("group_members")
    .select(`
      user_id,
      users!inner ( name )
    `)
    .eq("group_id", groupId)
    .eq("is_active", true);

  if (memberId) {
    query = query.eq("user_id", memberId);
  } else {
    query = query.eq("users.name", memberName);
  }

  const { data: member, error: memberError } = await query.maybeSingle();

  if (memberError) {
    console.error("checkMemberRemoval member lookup error:", memberError);
    return NextResponse.json(
      { error: "Failed to validate member removal." },
      { status: 400 }
    );
  }

  if (!member) {
    return NextResponse.json({
      canRemove: true,
      message: "",
    });
  }

  try {
    const canRemove = !(await isMemberInvolvedInGroupExpenses(groupId, member.user_id));

    return NextResponse.json({
      canRemove,
      message: canRemove
        ? ""
        : `${memberName || member.users.name} is involved in an expense in this group and cannot be removed.`,
    });
  } catch (error) {
    console.error("checkMemberRemoval error:", error);
    return NextResponse.json(
      { error: "Failed to validate member removal." },
      { status: 400 }
    );
  }
}
