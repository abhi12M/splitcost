"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import { getGroup, addExpense, GroupResponse } from "@/lib/storage";
import ExpenseFormMobile from "@/components/expense/ExpenseFormMobile";
import { ExpenseFormSkeleton } from "@/components/expense/ExpenseFormSkeleton";
import { saveExpenseAttachment } from "@/lib/expenseAttachments";

export default function AddExpensePage({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [group, setGroup] = useState<GroupResponse | undefined>();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchGroup = async () => {
      if (groupId) {
        setLoading(true);
        try {
          const fetchedGroup = await getGroup(groupId);
          setGroup(fetchedGroup);
        } catch (error) {
        } finally {
          setLoading(false);
        }
      }
    };
    fetchGroup();
  }, [groupId]);

  if (loading) {
    return (
      <ExpenseFormSkeleton />
    );
  }

  if (!group) {
    return (
      <Layout>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Group not found</p>
          <Button asChild className="mt-4">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const handleSubmit = async (data: Parameters<typeof addExpense>[1]) => {
    setIsSubmitting(true);
    try {
      const expense = await addExpense(groupId!, data);
      if (expense?.id && data.attachment) {
        await saveExpenseAttachment(expense.id, data.attachment);
      }
      // toast({
      //   title: "Expense added",
      //   description: "Your expense has been saved",
      // });
      router.push(`/group/${groupId}`);
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: "Failed to add expense",
      //   variant: "destructive",
      // });
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* ================= DESKTOP / TABLET ================= */}
      <div className="hidden md:block">
        <Layout>
          <div className="container py-6 md:py-8 max-w-2xl">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/group/${groupId}`}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to group
              </Link>
            </Button>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Add Expense</CardTitle>
                  <CardDescription className="truncate">
                    Record a new expense for {group.name}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ExpenseForm
                    members={group.members}
                    defaultCurrency={group.currency}
                    onSubmit={handleSubmit}
                    submitLabel={isSubmitting ? "Adding..." : "Add Expense"}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </Layout>
      </div>

      {/* ================= MOBILE ONLY ================= */}
      <div className="block md:hidden">
        <ExpenseFormMobile
          members={group.members}
          defaultCurrency={group.currency}
          groupId={groupId}
          onSubmit={handleSubmit}
        />
      </div>
      <Spinner show={isSubmitting} message="Creating..." />
    </>
  );
}
