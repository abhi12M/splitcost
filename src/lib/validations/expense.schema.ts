// validations/expense.schema.ts
import { z, ZodString } from "zod";

// Reusable trimmed non-empty string
const trimmedNonEmpty = (message: string): ZodString =>
    z.string().trim().nonempty(message);

export const EXPENSE_DESCRIPTION_MAX = 255;

export const ExpenseSchema = z.object({
    description: trimmedNonEmpty("Enter a description.").max(
        EXPENSE_DESCRIPTION_MAX,
        `Description can't exceed ${EXPENSE_DESCRIPTION_MAX} characters.`
    ),
    paidByUserId: z.string().optional(),
    isMultiplePayers: z.boolean().optional(),
    amount: z.string().nonempty("Enter an amount.").transform(Number),
}).refine(
    (data) => {
        // If multiple payers mode, paidByUserId is not required
        if (data.isMultiplePayers) return true;
        // Otherwise, paidByUserId must be a non-empty string
        return !!data.paidByUserId?.trim();
    },
    { message: "Select who paid.", path: ["paidByUserId"] }
);

export type ExpenseFormValues = z.infer<typeof ExpenseSchema>;
