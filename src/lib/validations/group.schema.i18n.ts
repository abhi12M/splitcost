import { z } from "zod";

import {
  GROUP_NAME_MAX,
  MEMBER_NAME_MAX,
  MEMBERS_MAX,
  MEMBERS_MIN,
} from "@/lib/validations/group.schema";

export type GroupValidationMessages = {
  memberNameRequired: string;
  memberNameMax: string;
  groupNameRequired: string;
  groupNameMax: string;
  membersMin: string;
  membersMax: string;
};

export function createGroupSchemas(messages: GroupValidationMessages) {
  const MemberNameSchema = z
    .string()
    .trim()
    .min(1, messages.memberNameRequired)
    .max(MEMBER_NAME_MAX, messages.memberNameMax);

  const GroupSchema = z.object({
    groupName: z
      .string()
      .trim()
      .min(1, messages.groupNameRequired)
      .max(GROUP_NAME_MAX, messages.groupNameMax),
    members: z
      .array(z.string())
      .min(MEMBERS_MIN, messages.membersMin)
      .max(MEMBERS_MAX, messages.membersMax),
  });

  return { MemberNameSchema, GroupSchema };
}
