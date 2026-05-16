// validations/group.schema.ts
import { z } from "zod";

export const GROUP_NAME_MAX = 50;
export const MEMBER_NAME_MAX = 30;
export const MEMBERS_MIN = 2;
export const MEMBERS_MAX = 50;

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
