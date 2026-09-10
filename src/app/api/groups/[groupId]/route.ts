import { supabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateGroupInput } from "@/lib/validations/group.schema";

type ActiveMemberRow = {
  user_id: string;
  users: {
    id: string;
    name: string;
  };
};

type GroupMemberResponseRow = {
  is_active: boolean | null;
  users: {
    id: string;
    name: string;
  };
};

type SubmittedMember = {
  id?: string;
  name: string;
};

async function getActiveGroupMembers(groupId: string) {
  const { data, error } = await supabaseAdmin
    .from("group_members")
    .select(`
      user_id,
      users!inner ( id, name )
    `)
    .eq("group_id", groupId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ActiveMemberRow[]).map((member) => ({
    userId: member.user_id,
    name: member.users.name,
  }));
}

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

export async function GET(
  _req: Request,
  { params }: { params: { groupId: string } }
) {
  const { data, error } = await supabaseAdmin
    .from("groups")
    .select(`
      id,
      name,
      currency,
      group_members (
        is_active,
        users ( id, name )
      )
    `)
    .eq("id", params.groupId)
    .eq("group_members.is_active", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(null, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    currency: data.currency,
    members: (data.group_members as GroupMemberResponseRow[]).map((member) => ({
      id: member.users.id,
      name: member.users.name,
    })),
  });
}

type UpdateGroupError = {
  message?: string;
};

export async function PUT(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  const groupId = params.groupId;
  const body: unknown = await req.json();
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { name, currency, members } = body as Record<string, unknown>;
  const normalizedCurrency = typeof currency === "string" ? currency.trim() : "";

  if (!groupId || !normalizedCurrency || !Array.isArray(members) || !members.every((member) => member && typeof member === "object")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const submittedMembers = members as SubmittedMember[];
  const validation = validateGroupInput(name, submittedMembers.map((member) => member.name));
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const normalizedMembers = submittedMembers.map((member, index) => ({
    id: member.id ? String(member.id).trim() : undefined,
    name: validation.data.memberNames[index],
  }));

  try {
    const currentMembers = await getActiveGroupMembers(groupId);
    const currentMembersById = new Map(
      currentMembers.map((member) => [member.userId, member])
    );
    const submittedExistingMembers = normalizedMembers.filter(
      (member): member is Required<Pick<SubmittedMember, "id">> & SubmittedMember =>
        Boolean(member.id)
    );
    const submittedExistingIds = new Set(
      submittedExistingMembers.map((member) => member.id)
    );

    const membersToRemove = currentMembers.filter(
      (member) => !submittedExistingIds.has(member.userId)
    );
    const membersToAdd = normalizedMembers.filter(
      (member) => !member.id
    );
    const membersToRename = submittedExistingMembers.filter((member) => {
      const currentMember = currentMembersById.get(member.id);
      return currentMember && currentMember.name !== member.name;
    });

    if (submittedExistingMembers.some((member) => !currentMembersById.has(member.id))) {
      return NextResponse.json(
        { error: "One or more members do not belong to this group." },
        { status: 400 }
      );
    }

    if (membersToRemove.length > 0) {
      const removableChecks = await Promise.all(
        membersToRemove.map(async (member) => ({
          ...member,
          isInvolved: await isMemberInvolvedInGroupExpenses(groupId, member.userId),
        }))
      );

      const blockedMembers = removableChecks
        .filter((member) => member.isInvolved)
        .map((member) => member.name);

      if (blockedMembers.length > 0) {
        const message =
          blockedMembers.length === 1
            ? `${blockedMembers[0]} is involved in an expense in this group and cannot be removed.`
            : `${blockedMembers.join(", ")} are involved in expenses in this group and cannot be removed.`;

        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    const { error: groupError } = await supabaseAdmin
      .from("groups")
      .update({
        name: validation.data.groupName,
        currency: normalizedCurrency,
        updated_at: new Date().toISOString(),
      })
      .eq("id", groupId);

    if (groupError) {
      throw groupError;
    }

    if (membersToRename.length > 0) {
      const renameResults = await Promise.all(
        membersToRename.map((member) =>
          supabaseAdmin
            .from("users")
            .update({ name: member.name, updated_at: new Date().toISOString() })
            .eq("id", member.id)
        )
      );

      const renameError = renameResults.find((result) => result.error)?.error;

      if (renameError) {
        throw renameError;
      }
    }

    if (membersToRemove.length > 0) {
      const { error: deactivateError } = await supabaseAdmin
        .from("group_members")
        .update({ is_active: false })
        .eq("group_id", groupId)
        .in(
          "user_id",
          membersToRemove.map((member) => member.userId)
        );

      if (deactivateError) {
        throw deactivateError;
      }

      const { error: cleanupError } = await supabaseAdmin.rpc(
        "cleanup_orphan_users",
        {
          p_user_ids: membersToRemove.map((member) => member.userId),
        }
      );

      if (cleanupError) {
        throw cleanupError;
      }
    }

    if (membersToAdd.length > 0) {
      const { data: insertedUsers, error: usersError } = await supabaseAdmin
        .from("users")
        .insert(membersToAdd.map((member) => ({ name: member.name })))
        .select("id, name");

      if (usersError) {
        throw usersError;
      }

      const { error: membersError } = await supabaseAdmin
        .from("group_members")
        .insert(
          (insertedUsers ?? []).map((user) => ({
            group_id: groupId,
            user_id: user.id,
            role: "member",
            is_active: true,
          }))
        );

      if (membersError) {
        throw membersError;
      }
    }

    const updatedMembers = await getActiveGroupMembers(groupId);

    return NextResponse.json({
      id: groupId,
      name: validation.data.groupName,
      currency: normalizedCurrency,
      members: updatedMembers.map((member) => ({
        id: member.userId,
        name: member.name,
      })),
    });
  } catch (error) {
    console.error("updateGroup error:", error);
    return NextResponse.json(
      { error: (error as UpdateGroupError)?.message || "Failed to update group" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { groupId: string } }
) {
  const { error } = await supabaseAdmin.rpc(
    "delete_group_and_cleanup_users",
    {
      p_group_id: params.groupId,
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
