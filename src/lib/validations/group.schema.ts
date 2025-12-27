// validations/group.schema.ts
import { z } from "zod";

export const GROUP_NAME_MAX = 50;
export const MEMBER_NAME_MAX = 30;
export const MEMBERS_MIN = 2;
export const MEMBERS_MAX = 50;

const trimmedRequired = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

export const GroupSchema = z.object({
  groupName: trimmedRequired("Group name").max(
    GROUP_NAME_MAX,
    `Group name cannot exceed ${GROUP_NAME_MAX} characters`
  ),

  members: z
    .array(
      trimmedRequired("Member name").max(
        MEMBER_NAME_MAX,
        `Member name cannot exceed ${MEMBER_NAME_MAX} characters`
      )
    )
    .min(MEMBERS_MIN, `At least ${MEMBERS_MIN} members are required`)
    .max(MEMBERS_MAX, `Maximum ${MEMBERS_MAX} members allowed`),
});
