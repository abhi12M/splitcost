// validations/group.schema.ts
import { z } from "zod";
import { hasDuplicateMemberNames } from "@/lib/validations/group-members";

export const GROUP_NAME_MAX = 50;
export const MEMBER_NAME_MAX = 30;
export const MEMBERS_MIN = 2;
export const MEMBERS_MAX = 4;

export const MemberNameSchema = z
  .string()
  .trim()
  .min(1, "Member name is required.")
  .max(
    MEMBER_NAME_MAX,
    `Member name can't exceed ${MEMBER_NAME_MAX} characters.`
  );

const trimmedRequired = (label: string) =>
  z.string().trim().min(1, `${label} is required.`);

export const GroupSchema = z.object({
  groupName: trimmedRequired("Group name").max(
    GROUP_NAME_MAX,
    `Group name can't exceed ${GROUP_NAME_MAX} characters.`
  ),

  members: z
    .array(z.string())
    .min(MEMBERS_MIN, `At least ${MEMBERS_MIN} members are required.`)
    .max(MEMBERS_MAX, `Maximum ${MEMBERS_MAX} members allowed.`),
});

/** Server-safe validation shared by the create and update group APIs. */
export function validateGroupInput(groupName: unknown, memberNames: unknown) {
  if (typeof groupName !== "string" || !Array.isArray(memberNames) || !memberNames.every((name) => typeof name === "string")) {
    return { success: false as const, error: "Invalid group payload." };
  }

  const normalizedGroupName = groupName.trim();
  const normalizedMemberNames = memberNames.map((name) => name.trim());
  const groupResult = GroupSchema.safeParse({
    groupName: normalizedGroupName,
    members: normalizedMemberNames,
  });

  if (!groupResult.success) {
    return { success: false as const, error: groupResult.error.issues[0]?.message ?? "Invalid group payload." };
  }

  for (const memberName of normalizedMemberNames) {
    const memberResult = MemberNameSchema.safeParse(memberName);
    if (!memberResult.success) {
      return { success: false as const, error: memberResult.error.issues[0]?.message ?? "Invalid member name." };
    }
  }

  if (hasDuplicateMemberNames(normalizedMemberNames)) {
    return { success: false as const, error: "Member names must be unique." };
  }

  return {
    success: true as const,
    data: { groupName: normalizedGroupName, memberNames: normalizedMemberNames },
  };
}
