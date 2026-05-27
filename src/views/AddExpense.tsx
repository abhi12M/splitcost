"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import {
  addExpense,
  type EditExpenseInterface,
} from "@/lib/storage";
import ExpenseFormMobile from "@/components/expense/ExpenseFormMobile";
import { ExpenseFormSkeleton } from "@/components/expense/ExpenseFormSkeleton";
import { startAttachmentUpload } from "@/lib/attachmentUploads";
import {
  invalidateGroupDashboard,
  queryKeys,
  useGroupQuery,
} from "@/lib/queries";
import { saveCachedExpense } from "@/lib/expenseCache";
import { getGroupViewerMemberId } from "@/lib/groupViewer";

export default function AddExpensePage({ groupId }: { groupId: string }) {
  const t = useTranslations("expense");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const queryClient = useQueryClient();
  // React Query owns the group fetch and (when available) hydrates from the
  // dashboard query's cache, so navigating dashboard -> add expense renders
  // instantly with zero new network requests. Direct URL / hard reload
  // still falls back to `GET /api/groups/:id`.
  const groupQuery = useGroupQuery(groupId);
  const group = groupQuery.data ?? undefined;
  const loading = groupQuery.isPending;
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <ExpenseFormSkeleton />
    );
  }

  if (!group) {
    return (
      <Layout variant="minimal">
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">{tCommon("groupNotFound")}</p>
          <Button asChild className="mt-4">
            <Link href="/">{tCommon("goHome")}</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const viewerId = getGroupViewerMemberId(groupId);
  const defaultPaidByUserId =
    viewerId && group.members.some((m) => m.id === viewerId) ? viewerId : undefined;

  const handleSubmit = async (data: Parameters<typeof addExpense>[1]) => {
    setIsSubmitting(true);
    try {
      const expense = await addExpense(groupId!, data);

      if (expense?.id && group) {
        // Seed the React Query cache (and sessionStorage) for the brand
        // new expense so its detail page renders instantly with zero
        // network requests. The form's `data` already matches the request
        // shape that `ExpenseFormInterface` uses (paidByUserId / payers /
        // participants are all in request form), so we can construct the
        // cached payload from data + the id/timestamps the API returned
        // + the group we loaded for the form. The attachment is left as
        // null here — the background upload populates it via
        // `commitToQuery` once it settles, and until then the view reads
        // the upload store for an immediate local preview.
        const seeded: EditExpenseInterface = {
          group,
          expense: {
            id: expense.id,
            amount: data.amount,
            description: data.description,
            currency: data.currency,
            paidByUserId: data.paidByUserId,
            payers: data.payers,
            splitType: data.splitType,
            category: data.category,
            subcategory: data.subcategory,
            date: data.date,
            participants: data.participants,
            attachment: null,
            attachmentDataUrl: null,
            createdAt: expense.createdAt,
            updatedAt: expense.updatedAt,
          },
        };
        queryClient.setQueryData(queryKeys.expense(expense.id), seeded);
        saveCachedExpense(expense.id, seeded);
      }

      // Push the attachment in the background so the user isn't blocked on
      // the multipart upload. The expense view will surface a spinner over
      // the local preview until the upload settles, and then swap in the
      // server's signed URL via the React Query cache.
      if (expense?.id && data.attachment?.file) {
        startAttachmentUpload(queryClient, expense.id, data.attachment);
      }
      invalidateGroupDashboard(queryClient, groupId);
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
        <Layout variant="minimal">
          <div className="container py-6 md:py-8 max-w-2xl">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/group/${groupId}`}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t("backToGroup")}
              </Link>
            </Button>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{t("addExpense")}</CardTitle>
                  <CardDescription className="truncate">
                    {t("recordForGroup", { name: group.name })}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ExpenseForm
                    members={group.members}
                    defaultCurrency={group.currency}
                    defaultPaidByUserId={defaultPaidByUserId}
                    viewerMemberId={defaultPaidByUserId ?? null}
                    onSubmit={handleSubmit}
                    submitLabel={isSubmitting ? tCommon("adding") : t("addExpense")}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </Layout>
      </div>

      {/* ================= MOBILE ONLY ================= */}
      <div className="block md:hidden">
        <ExpenseFormMobile
          members={group.members}
          defaultCurrency={group.currency}
          defaultPaidByUserId={defaultPaidByUserId}
          viewerMemberId={defaultPaidByUserId ?? null}
          groupId={groupId}
          onSubmit={handleSubmit}
        />
      </div>
      <Spinner show={isSubmitting} message={tCommon("creating")} />
    </>
  );
}
