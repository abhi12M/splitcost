// validations/expense.schema.ts
import { z, ZodString } from "zod";

// Reusable trimmed non-empty string
const trimmedNonEmpty = (message: string): ZodString =>
    z.string().trim().nonempty(message);

export const ExpenseSchema = z.object({
    description: trimmedNonEmpty("Enter a description."),
    paidByUserId: trimmedNonEmpty("Select who paid."),
    amount: z.string().nonempty("Enter an amount.").transform(Number),
});

export type ExpenseFormValues = z.infer<typeof ExpenseSchema>;
