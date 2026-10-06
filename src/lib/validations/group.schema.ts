// validations/group.schema.ts
import { z } from "zod";
import { hasDuplicateMemberNames } from "@/lib/validations/group-members";
import { cleanNameField } from "@/lib/validations/names";

export const GROUP_NAME_MAX = 50;
export const MEMBER_NAME_MAX = 30;
export const MEMBERS_MIN = 2;
export const MEMBERS_MAX = 30;

export const MemberNameSchema = cleanNameField({
  required: "Member name is required.",
  max: MEMBER_NAME_MAX,
  maxMessage: `Member name can't exceed ${MEMBER_NAME_MAX} characters.`,
});

export const GroupSchema = z.object({
  groupName: cleanNameField({
    required: "Group name is required.",
    max: GROUP_NAME_MAX,
    maxMessage: `Group name can't exceed ${GROUP_NAME_MAX} characters.`,
  }),

  members: z
    .array(z.string())
    .min(MEMBERS_MIN, `At least ${MEMBERS_MIN} members are required.`)
    .max(MEMBERS_MAX, `Maximum ${MEMBERS_MAX} members allowed.`),
});

/** Server-safe validation shared by the create and update group APIs. Returns the cleaned names to save. */
export function validateGroupInput(groupName: unknown, memberNames: unknown) {
  if (typeof groupName !== "string" || !Array.isArray(memberNames) || !memberNames.every((name) => typeof name === "string")) {
    return { success: false as const, error: "Invalid group payload." };
  }

  const groupResult = GroupSchema.safeParse({ groupName, members: memberNames });
  if (!groupResult.success) {
    return { success: false as const, error: groupResult.error.issues[0]?.message ?? "Invalid group payload." };
  }

  const cleanedMemberNames: string[] = [];
  for (const memberName of memberNames) {
    const memberResult = MemberNameSchema.safeParse(memberName);
    if (!memberResult.success) {
      return { success: false as const, error: memberResult.error.issues[0]?.message ?? "Invalid member name." };
    }
    cleanedMemberNames.push(memberResult.data);
  }

  if (hasDuplicateMemberNames(cleanedMemberNames)) {
    return { success: false as const, error: "Member names must be unique." };
  }

  return {
    success: true as const,
    data: { groupName: groupResult.data.groupName, memberNames: cleanedMemberNames },
  };
}
