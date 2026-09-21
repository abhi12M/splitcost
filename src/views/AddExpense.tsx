"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExpenseForm } from "@/components/expense/ExpenseForm";
import { addExpense } from "@/lib/storage";
import ExpenseFormMobile from "@/components/expense/ExpenseFormMobile";
import { ExpenseFormSkeleton } from "@/components/expense/ExpenseFormSkeleton";
import { startAttachmentUpload } from "@/lib/attachmentUploads";
import { useGroup } from "@/lib/groupExpenseData";
import { getGroupViewerMemberId } from "@/lib/groupViewer";

export default function AddExpensePage({ groupId }: { groupId: string }) {
  const t = useTranslations("expense");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { data: groupData, loading } = useGroup(groupId);
  const group = groupData ?? undefined;
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

      if (expense?.id && data.attachment?.file) {
        startAttachmentUpload(groupId, expense.id, data.attachment);
      }
      router.push(`/group/${groupId}`);
    } catch (error) {
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
