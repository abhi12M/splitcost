import { recordGroupChanges } from "@/lib/activity/server/recordGroupActivity";
import { errorJson } from "@/lib/api/errors";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { isValidUUID } from "@/lib/api/expenseValidation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { removeAttachmentFiles } from "@/lib/supabase/attachments";
import { NextResponse } from "next/server";
import { validateGroupInput } from "@/lib/validations/group.schema";
import {
  GROUP_CURRENCY_LOCKED_ERROR,
  toSupportedCurrency,
  UNSUPPORTED_CURRENCY_ERROR,
} from "@/constants/currencies";
import {
  GROUP_CHANGES_EVENT,
  GROUP_DELETED_EVENT,
  groupChangesChannel,
  type GroupChanges,
  type GroupDeleted,
} from "@/lib/realtime/groupChanges";

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

// Best effort: a failed broadcast must not fail a group change that has
// already been saved.
async function broadcastToGroup(groupId: string, event: string, payload: unknown) {
  const channel = supabaseAdmin.channel(groupChangesChannel(groupId));
  try {
    const result = await channel.httpSend(event, payload);
    if (!result.success) {
      console.error(`broadcast ${event} error:`, result.error);
    }
  } catch (error) {
    console.error(`broadcast ${event} error:`, error);
  } finally {
    void supabaseAdmin.removeChannel(channel);
  }
}

function broadcastGroupChanges(groupId: string, changes: GroupChanges) {
  return broadcastToGroup(groupId, GROUP_CHANGES_EVENT, changes);
}

function broadcastGroupDeleted(groupId: string, payload: GroupDeleted) {
  return broadcastToGroup(groupId, GROUP_DELETED_EVENT, payload);
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
  if (!isValidUUID(params.groupId)) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

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

function groupVersionConflict(groupId: string, expectedRevision: number, currentRevision: number | null) {
  return NextResponse.json(
    { code: "GROUP_VERSION_CONFLICT", groupId, expectedRevision, currentRevision },
    { status: 409 }
  );
}

export async function PUT(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  const groupId = params.groupId;
  const parsed = await readJsonObject(req, {
    allowedKeys: ["name", "currency", "members", "originSessionId", "expectedRevision"],
  });
  if (!parsed.ok) return parsed.response;
  const { name, currency, members, originSessionId, expectedRevision: rawExpectedRevision } =
    parsed.data;
  // The revision the editor started from. Without it the save is not checked.
  const expectedRevision =
    typeof rawExpectedRevision === "number" && Number.isInteger(rawExpectedRevision)
      ? rawExpectedRevision
      : null;
  const normalizedCurrency = toSupportedCurrency(currency);

  if (!isValidUUID(groupId)) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }
  if (!Array.isArray(members) || !members.every((member) => member && typeof member === "object")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (!normalizedCurrency) {
    return NextResponse.json({ error: UNSUPPORTED_CURRENCY_ERROR }, { status: 400 });
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

  const seenMemberIds = new Set<string>();
  for (const member of normalizedMembers) {
    if (member.id) {
      if (!isValidUUID(member.id)) {
        return NextResponse.json({ error: "Invalid member ID" }, { status: 400 });
      }
      if (seenMemberIds.has(member.id)) {
        return NextResponse.json({ error: "Duplicate member ID" }, { status: 400 });
      }
      seenMemberIds.add(member.id);
    }
  }

  try {
    const [currentMembers, { data: currentGroup, error: currentGroupError }] = await Promise.all([
      getActiveGroupMembers(groupId),
      supabaseAdmin.from("groups").select("name, currency, revision").eq("id", groupId).maybeSingle(),
    ]);

    if (currentGroupError) {
      throw currentGroupError;
    }

    if (!currentGroup) {
      return NextResponse.json({ code: "GROUP_NOT_FOUND" }, { status: 404 });
    }

    // Checked before validation, so an editor holding a stale member list gets
    // a conflict rather than a confusing "member does not belong" error.
    if (expectedRevision !== null && currentGroup.revision !== expectedRevision) {
      return groupVersionConflict(groupId, expectedRevision, currentGroup.revision);
    }

    // A group's currency is set when it's created; its expenses are all in it.
    if (normalizedCurrency !== currentGroup.currency) {
      return NextResponse.json({ error: GROUP_CURRENCY_LOCKED_ERROR }, { status: 400 });
    }

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

    const nameChanged = currentGroup.name !== validation.data.groupName;

    // Nothing to save: leave the revision alone, so other open editors are not
    // pushed into a conflict by a save that changed nothing.
    if (
      !membersToAdd.length &&
      !membersToRemove.length &&
      !membersToRename.length &&
      !nameChanged
    ) {
      return successJson(
        {
          id: groupId,
          name: currentGroup.name,
          currency: currentGroup.currency,
          revision: currentGroup.revision,
          members: currentMembers.map((member) => ({ id: member.userId, name: member.name })),
        },
        SUCCESS_MESSAGES.groupUnchanged
      );
    }

    // Claim the next revision before the first write. The check above can race
    // with another save; this compare-and-swap cannot.
    const { data: nextRevision, error: revisionError } = await supabaseAdmin.rpc("bump_group_revision", {
      p_group_id: groupId,
      p_expected_revision: expectedRevision,
    });

    if (revisionError) {
      if (revisionError.message === "GROUP_NOT_FOUND") {
        return NextResponse.json({ code: "GROUP_NOT_FOUND" }, { status: 404 });
      }
      if (revisionError.message?.startsWith("GROUP_VERSION_CONFLICT:") && expectedRevision !== null) {
        const currentRevision = Number(revisionError.message.split(":")[1]);
        return groupVersionConflict(groupId, expectedRevision, Number.isFinite(currentRevision) ? currentRevision : null);
      }
      throw revisionError;
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
      const { error: removeMembersError } = await supabaseAdmin
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .in(
          "user_id",
          membersToRemove.map((member) => member.userId)
        );

      if (removeMembersError) {
        throw removeMembersError;
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

    let addedMembers: { id: string; name: string }[] = [];

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

      addedMembers = insertedUsers ?? [];
    }

    const { error: groupError } = await supabaseAdmin
      .from("groups")
      .update({
        name: validation.data.groupName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", groupId);

    if (groupError) {
      throw groupError;
    }

    const changes: GroupChanges = {
      added: addedMembers,
      removed: membersToRemove.map((member) => ({ id: member.userId, name: member.name })),
      renamed: membersToRename.map((member) => ({
        id: member.id,
        from: currentMembersById.get(member.id)?.name ?? member.name,
        to: member.name,
      })),
      revision: nextRevision,
      originSessionId: typeof originSessionId === "string" ? originSessionId.slice(0, 128) : null,
    };
    if (nameChanged) {
      changes.name = { from: currentGroup.name, to: validation.data.groupName };
    }

    // Every bumped revision is broadcast, so open editors stay on the latest one.
    await Promise.all([broadcastGroupChanges(groupId, changes), recordGroupChanges(groupId, changes)]);

    const updatedMembers = await getActiveGroupMembers(groupId);

    return successJson(
      {
        id: groupId,
        name: validation.data.groupName,
        currency: currentGroup.currency,
        revision: nextRevision,
        members: updatedMembers.map((member) => ({
          id: member.userId,
          name: member.name,
        })),
      },
      SUCCESS_MESSAGES.groupUpdated
    );
  } catch (error) {
    console.error("updateGroup error:", error);
    return errorJson("Failed to update group", 400, error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { groupId: string } }
) {
  if (!isValidUUID(params.groupId)) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  const delParsed = await readJsonObject(req, { allowedKeys: ["originSessionId"] });
  const body = delParsed.ok ? delParsed.data : null;

  // The group's expenses go with it, so note their receipt files first: once the
  // rows are gone nothing says which files they were.
  const receipts = await supabaseAdmin
    .from("expenses")
    .select("attachment_data_url")
    .eq("group_id", params.groupId)
    .not("attachment_data_url", "is", null);
  if (receipts.error) console.error("listGroupReceipts error:", receipts.error);

  const { error } = await supabaseAdmin.rpc(
    "delete_group_and_cleanup_users",
    {
      p_group_id: params.groupId,
    }
  );

  if (error) {
    console.error("deleteGroup error:", error);
    return errorJson("Failed to delete group", 400, error);
  }

  await removeAttachmentFiles(
    (receipts.data ?? []).map((row) => row.attachment_data_url),
    "removeDeletedGroupReceipts"
  );

  // Tell open screens of this group (other tabs and devices) that it's gone.
  await broadcastGroupDeleted(params.groupId, {
    originSessionId:
      typeof body?.originSessionId === "string" ? body.originSessionId.slice(0, 128) : null,
  });

  return successJson({ success: true }, SUCCESS_MESSAGES.groupDeleted);
}
