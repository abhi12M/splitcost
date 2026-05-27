import { z } from "zod";

import { EXPENSE_DESCRIPTION_MAX } from "@/lib/validations/expense.schema";

export type ExpenseValidationMessages = {
  descriptionRequired: string;
  descriptionMax: string;
  amountRequired: string;
  paidByRequired: string;
};

export function createExpenseSchema(messages: ExpenseValidationMessages) {
  return z
    .object({
      description: z
        .string()
        .trim()
        .nonempty(messages.descriptionRequired)
        .max(EXPENSE_DESCRIPTION_MAX, messages.descriptionMax),
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
