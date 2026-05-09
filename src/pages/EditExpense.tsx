"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import { updateExpense, GroupResponse, editExpense, ExpenseFormInterface } from "@/lib/storage";
import ExpenseFormMobile from "@/components/expense/ExpenseFormMobile";
import { ExpenseFormSkeleton } from "@/components/expense/ExpenseFormSkeleton";
import { Spinner } from "@/components/ui/Spinner";
import {
  ExpenseAttachment,
  loadExpenseAttachment,
  saveExpenseAttachment,
} from "@/lib/expenseAttachments";

export default function EditExpensePage({ groupId, expenseId }: { groupId: string; expenseId: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupResponse | undefined>();
  const [expense, setExpense] = useState<ExpenseFormInterface | undefined>();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachment, setAttachment] = useState<ExpenseAttachment | null>(null);

  useEffect(() => {
    if (!groupId || !expenseId) return;
    setLoading(true);

    editExpense(expenseId)
      .then(async (details) => {
        if (!details) return;

        setGroup(details.group);
        setExpense(details.expense);
        const storedAttachment = await loadExpenseAttachment(
          expenseId,
          details.expense.attachmentDataUrl
        );
        setAttachment(storedAttachment);
      })
      .finally(() => setLoading(false));
  }, [groupId, expenseId]);

  if (loading) {
    return (
      <ExpenseFormSkeleton />
    );
  }

  if (!group || !expense) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Expense not found</p>
          <Button asChild className="mt-4">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const handleSubmit = async (data: Parameters<typeof updateExpense>[2]) => {
    setIsSubmitting(true);
    try {
      await updateExpense(groupId!, expenseId!, data);
      if (data.attachment || attachment) {
        const nextAttachment = await saveExpenseAttachment(expenseId!, data.attachment);
        setAttachment(nextAttachment);
      }
      // toast({
      //   title: "Expense updated",
      //   description: "Your changes have been saved",
      // });
      router.push(`/group/${groupId}`);
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: "Failed to update expense",
      //   variant: "destructive",
      // });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="hidden md:block">
        <Layout>
          <div className="container py-6 md:py-8 max-w-2xl">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/group/${groupId}`}>
                <ArrowLeft className="w-4 h-4" />
                Back to group
              </Link>
            </Button>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">Edit Expense</CardTitle>
                      <CardDescription>Modify the expense details</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <ExpenseForm
                    members={group.members}
                    defaultCurrency={group.currency}
                    initialData={{
                      ...expense
                    }}
                    initialAttachment={attachment}
                    onSubmit={handleSubmit}
                    submitLabel={isSubmitting ? "Saving..." : "Save Changes"}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </Layout>
      </div>
      <div className="block md:hidden">
        <ExpenseFormMobile
          members={group.members}
          defaultCurrency={group.currency}
          groupId={groupId}
          initialData={{
            ...expense
          }}
          initialAttachment={attachment}
          onSubmit={handleSubmit}
        />
      </div>
      <Spinner show={isSubmitting} message="Saving..." />
    </>
  );
}
