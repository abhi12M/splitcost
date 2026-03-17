import { NextResponse } from "next/server";

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
  const body = await req.json();
  const memberId = String(body?.memberId ?? "").trim();
  const memberName = String(body?.memberName ?? "").trim();

  if (!groupId || (!memberId && !memberName)) {
    return NextResponse.json(
      { error: "Group id and member details are required." },
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
