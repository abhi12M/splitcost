"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import { updateExpense } from "@/lib/storage";
import ExpenseFormMobile from "@/components/expense/ExpenseFormMobile";
import { ExpenseFormSkeleton } from "@/components/expense/ExpenseFormSkeleton";
import { Spinner } from "@/components/ui/Spinner";
import { ExpenseAttachment } from "@/lib/expenseAttachments";
import { startAttachmentUpload } from "@/lib/attachmentUploads";
import {
  invalidateExpense,
  invalidateGroupDashboard,
  useExpenseQuery,
} from "@/lib/queries";
import { getGroupViewerMemberId } from "@/lib/groupViewer";

export default function EditExpensePage({ groupId, expenseId }: { groupId: string; expenseId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // React Query backs the expense fetch. Hydrating from sessionStorage means
  // navigating view -> edit within the staleTime window (30s) renders the
  // form instantly with zero new network requests.
  const expenseQuery = useExpenseQuery(expenseId);
  const group = expenseQuery.data?.group;
  const expense = expenseQuery.data?.expense;
  // Local override so successful save flows can swap the saved attachment in
  // before we navigate away from the page.
  const [attachmentOverride, setAttachmentOverride] =
    useState<ExpenseAttachment | null | undefined>(undefined);
  const attachment =
    attachmentOverride !== undefined
      ? attachmentOverride
      : expense?.attachment ?? null;
  const loading = expenseQuery.isPending;
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <ExpenseFormSkeleton />
    );
  }

  if (!group || !expense) {
    return (
      <Layout variant="minimal">
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Expense not found</p>
          <Button asChild className="mt-4">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const storedViewerId = getGroupViewerMemberId(groupId);
  const editViewerMemberId =
    storedViewerId && group.members.some((m) => m.id === storedViewerId)
      ? storedViewerId
      : null;

  const handleSubmit = async (data: Parameters<typeof updateExpense>[2]) => {
    setIsSubmitting(true);
    try {
      await updateExpense(groupId!, expenseId!, data);

      // Decide whether the attachment actually changed. The form passes:
      //   - the existing attachment (no `file`) when untouched
      //   - a fresh attachment with `file` when the user picked a new image
      //   - null when the user explicitly removed it
      // Only the latter two need server work; the in-flight call runs in
      // the background so the user isn't blocked on the upload round-trip.
      const isNewFile = Boolean(data.attachment?.file);
      const isRemoval = data.attachment === null && Boolean(attachment);
      if (isNewFile || isRemoval) {
        startAttachmentUpload(queryClient, expenseId!, data.attachment ?? null);
        // Reflect the user's intent locally for the brief moment before we
        // navigate away. (The view page reads the upload store directly.)
        setAttachmentOverride(data.attachment ?? null);
      }

      // Invalidate so the next mount of view/edit and the dashboard refetch
      // fresh data, but the user-perceived hop back is instant (cached
      // dashboard renders immediately, refetch happens in the background).
      invalidateExpense(queryClient, expenseId);
      invalidateGroupDashboard(queryClient, groupId);
      router.push(`/group/${groupId}`);
    } catch (error) {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="hidden md:block">
        <Layout variant="minimal">
          <div className="container py-6 md:py-8 max-w-2xl">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/group/${groupId}`}>
                <ArrowLeft className="w-4 h-4" />
                Back to group
              </Link>
            </Button>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                    viewerMemberId={editViewerMemberId}
                    initialData={{
                      ...expense
                    }}
                    initialAttachment={attachment}
                    onSubmit={handleSubmit}
                    submitLabel={isSubmitting ? "Saving..." : "Save Changes"}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </Layout>
      </div>
      <div className="block md:hidden">
        <ExpenseFormMobile
          members={group.members}
          defaultCurrency={group.currency}
          viewerMemberId={editViewerMemberId}
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
