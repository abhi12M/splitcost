// validations/expense.schema.ts
import { z, ZodString } from "zod";

// Reusable trimmed non-empty string
const trimmedNonEmpty = (message: string): ZodString =>
    z.string().trim().nonempty(message);

export const ExpenseSchema = z.object({
    description: trimmedNonEmpty("Description is required."),
    paidBy: trimmedNonEmpty("Paid by is required."),
    amount: z.string().nonempty("Amount is required.").transform(Number),
    participants: z.array(z.string()).min(1, "At least one participant is required."),
    category: trimmedNonEmpty("Category is required."),
});

export type ExpenseFormValues = z.infer<typeof ExpenseSchema>;
