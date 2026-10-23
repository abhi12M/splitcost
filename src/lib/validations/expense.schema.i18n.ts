import { z } from "zod";

import { EXPENSE_DESCRIPTION_MAX } from "@/lib/validations/expense.schema";
import { cleanNameField } from "@/lib/validations/names";

export type ExpenseValidationMessages = {
  descriptionRequired: string;
  descriptionMax: string;
  amountRequired: string;
  paidByRequired: string;
};

export function createExpenseSchema(messages: ExpenseValidationMessages) {
  return z
    .object({
      description: cleanNameField({
        required: messages.descriptionRequired,
        max: EXPENSE_DESCRIPTION_MAX,
        maxMessage: messages.descriptionMax,
      }),
      paidByUserId: z.string().optional(),
      isMultiplePayers: z.boolean().optional(),
      amount: z.string().nonempty(messages.amountRequired).transform(Number),
    })
    .refine(
      (data) => {
        if (data.isMultiplePayers) return true;
        return !!data.paidByUserId?.trim();
      },
      { message: messages.paidByRequired, path: ["paidByUserId"] }
    );
}
