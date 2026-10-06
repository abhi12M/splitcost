// validations/expense.schema.ts
import { z } from "zod";
import { cleanNameField } from "@/lib/validations/names";

export const EXPENSE_DESCRIPTION_MAX = 255;

export const ExpenseDescriptionSchema = cleanNameField({
    required: "Enter a description.",
    max: EXPENSE_DESCRIPTION_MAX,
    maxMessage: `Description can't exceed ${EXPENSE_DESCRIPTION_MAX} characters.`,
});

export const ExpenseSchema = z.object({
    description: ExpenseDescriptionSchema,
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

/** Server-side check of an expense description. Returns the cleaned description to save. */
export function validateExpenseDescription(description: unknown) {
    if (typeof description !== "string") {
        return { success: false as const, error: "Enter a description." };
    }
    const result = ExpenseDescriptionSchema.safeParse(description);
    return result.success
        ? { success: true as const, data: result.data }
        : { success: false as const, error: result.error.issues[0]?.message ?? "Enter a description." };
}
