import { z } from "zod";

import {
  GROUP_NAME_MAX,
  MEMBER_NAME_MAX,
  MEMBERS_MAX,
  MEMBERS_MIN,
} from "@/lib/validations/group.schema";
import { cleanNameField } from "@/lib/validations/names";

export type GroupValidationMessages = {
  memberNameRequired: string;
  memberNameMax: string;
  groupNameRequired: string;
  groupNameMax: string;
  membersMin: string;
  membersMax: string;
};

/** The same rules as the server (see group.schema.ts), with translated messages for the forms. */
export function createGroupSchemas(messages: GroupValidationMessages) {
  const MemberNameSchema = cleanNameField({
    required: messages.memberNameRequired,
    max: MEMBER_NAME_MAX,
    maxMessage: messages.memberNameMax,
  });

  const GroupSchema = z.object({
    groupName: cleanNameField({
      required: messages.groupNameRequired,
      max: GROUP_NAME_MAX,
      maxMessage: messages.groupNameMax,
    }),
    members: z
      .array(z.string())
      .min(MEMBERS_MIN, messages.membersMin)
      .max(MEMBERS_MAX, messages.membersMax),
  });

  return { MemberNameSchema, GroupSchema };
}
