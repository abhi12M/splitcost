"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  ImagePlus,
  Loader2,
  NotebookPen,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExpenseAttachmentViewer } from "@/components/expense/ExpenseAttachmentViewer";
import { Spinner } from "@/components/ui/Spinner";
import {
  getCategoryIcon,
  EXPENSE_CATEGORIES,
  type CategoryKey,
} from "@/components/icons/CategoryIcons";
import {
  deleteExpense,
  EditExpenseInterface,
  patchExpenseCategory,
  ExpenseParticipantsRequest,
} from "@/lib/storage";
import {
  formatAmount,
  formatDisplayDate,
  formatDisplayDateTime,
} from "@/components/ui/formatters";
import {
  deleteExpenseAttachment,
  ExpenseAttachment,
  readExpenseAttachmentFile,
  revokeAttachmentObjectUrl,
  saveExpenseAttachment,
  validateAttachmentFile,
} from "@/lib/expenseAttachments";
import {
  evictExpense,
  invalidateGroupDashboard,
  patchExpenseAttachmentInDashboard,
  queryKeys,
  useExpenseQuery,
} from "@/lib/queries";
import { getGroupViewerMemberId } from "@/lib/groupViewer";
import { memberNameForViewer } from "@/lib/groupExpenseLabels";
import { formatSummaryName } from "@/components/ui/formatters";
import {
  dismissAttachmentUpload,
  useAttachmentUpload,
} from "@/lib/attachmentUploads";
import { Skeleton } from "@/components/ui/skeleton";
import { SingleSelect } from "@/components/ui/single-select";
import { sanitizeExpenseNotes } from "@/lib/expenseNotes";

function memberName(
  members: EditExpenseInterface["group"]["members"],
  userId: string | null,
  viewerMemberId: string | null,
  unknownLabel: string
) {
  if (!userId) return unknownLabel;
  const m = members.find((member) => member.id === userId);
  if (!m) return unknownLabel;
  return memberNameForViewer(m.id, m.name, viewerMemberId);
}

function getDateTimeMs(date?: string | Date | null) {
  if (!date) return null;

  const value = typeof date === "string" ? new Date(date) : date;
  const time = value.getTime();

  return Number.isNaN(time) ? null : time;
}

function shouldShowUpdatedAt(
  createdAt?: string | Date | null,
  updatedAt?: string | Date | null
) {
  const updatedAtMs = getDateTimeMs(updatedAt);

  if (updatedAtMs === null) {
    return false;
  }

  const createdAtMs = getDateTimeMs(createdAt);

  if (createdAtMs === null) {
    return true;
  }

  return Math.abs(updatedAtMs - createdAtMs) > 1000;
}

function calculateExpenseSettlements(
  members: EditExpenseInterface["group"]["members"],
  payers: { userId: string | null; amount: number }[],
  participants: ExpenseParticipantsRequest[],
  unknownLabel: string
) {
  const balances = new Map<string, number>();

  const addBalance = (userId: string | null, amount: number) => {
    if (!userId) return;
    balances.set(userId, Math.round(((balances.get(userId) ?? 0) + amount) * 100) / 100);
  };

  payers.forEach((payer) => addBalance(payer.userId, Number(payer.amount) || 0));
  participants.forEach((participant) =>
    addBalance(participant.userId, -(Number(participant.amount) || 0))
  );

  const debtors = Array.from(balances.entries())
    .filter(([, balance]) => balance < -0.01)
    .map(([userId, balance]) => ({ userId, balance }))
    .sort((a, b) => a.balance - b.balance);

  const creditors = Array.from(balances.entries())
    .filter(([, balance]) => balance > 0.01)
    .map(([userId, balance]) => ({ userId, balance }))
    .sort((a, b) => b.balance - a.balance);

  const settlements: { fromId: string; fromName: string; toId: string; toName: string; amount: number }[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const amount = Math.min(-debtors[debtorIndex].balance, creditors[creditorIndex].balance);

    settlements.push({
      fromId: debtors[debtorIndex].userId,
      fromName: memberName(members, debtors[debtorIndex].userId, null, unknownLabel),
      toId: creditors[creditorIndex].userId,
      toName: memberName(members, creditors[creditorIndex].userId, null, unknownLabel),
      amount: Math.round(amount * 100) / 100,
    });

    debtors[debtorIndex].balance += amount;
    creditors[creditorIndex].balance -= amount;

    if (Math.abs(debtors[debtorIndex].balance) < 0.01) debtorIndex += 1;
    if (Math.abs(creditors[creditorIndex].balance) < 0.01) creditorIndex += 1;
  }

  return settlements;
}

function ExpenseDetailsSkeleton() {
  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex h-full max-w-3xl flex-col">
        <header className="relative shrink-0 border-b bg-muted/40 px-3 sm:px-4">
          <div className="flex h-14 items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
          <Skeleton className="absolute bottom-[-24px] left-[5rem] h-16 w-16 rounded-md" />
        </header>

        <main className="grid min-h-0 flex-1 grid-rows-[auto_1fr] gap-3 p-4 pt-6">
          <section className="shrink-0">
            <div className="space-y-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-9 w-36" />
              <div className="flex gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-3 w-48" />
            </div>
          </section>

          <section className="grid shrink-0 gap-3 md:grid-cols-[1fr_0.85fr]">
            <div className="rounded-lg border bg-card p-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="flex items-center justify-between gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>

                {/* <div className="h-px bg-border" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div> */}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function ExpenseDetailsPage({
  groupId,
  expenseId,
}: {
  groupId: string;
  expenseId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("expense");
  const tCommon = useTranslations("common");
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // React Query owns expense fetching. With initialData hydrated from the
  // session cache and a 30s staleTime, navigating view -> edit (or vice
  // versa) inside that window reuses the cached data and fires zero new
  // requests. After a save we invalidate the key so the next mount refetches.
  const expenseQuery = useExpenseQuery(expenseId);
  const details = expenseQuery.data ?? null;
  const loading = expenseQuery.isPending;

  const [viewerMemberId, setViewerMemberId] = useState<string | null>(null);
  useEffect(() => {
    setViewerMemberId(getGroupViewerMemberId(groupId));
  }, [groupId]);

  // `removeQueries` while `useExpenseQuery` is still subscribed triggers an
  // automatic refetch → GET /api/expenses/:id → 404 after delete. Defer
  // eviction until this component unmounts so no observer asks for data.
  const evictExpenseAfterUnmountRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      const id = evictExpenseAfterUnmountRef.current;
      if (id && id === expenseId) {
        evictExpense(queryClient, id);
        evictExpenseAfterUnmountRef.current = null;
      }
    };
  }, [expenseId, queryClient]);
  const [attachmentOverride, setAttachmentOverride] =
    useState<ExpenseAttachment | null | undefined>(undefined);
  // Tracks any attachment save kicked off in the background by the Add /
  // Edit form (or by this page itself). When something is in flight we
  // render the local blob preview behind a spinner so the user sees the
  // intended next state instead of stale server data.
  const pendingUpload = useAttachmentUpload(expenseId);
  const isAttachmentUploading = pendingUpload?.status === "uploading";
  // The attachment is part of the expense payload but the user can replace /
  // delete it from this page without invalidating the query. The override lets
  // those local mutations win until the next refetch.
  const cachedAttachment =
    attachmentOverride !== undefined
      ? attachmentOverride
      : details?.expense.attachment ?? null;
  // While an upload is in flight the pending state's intent wins over what
  // the cache says (which may still be the pre-save server value). For new
  // uploads `intent` is the attachment we're trying to save (with a blob
  // preview URL); for deletes it's `null`.
  const attachment = pendingUpload
    ? pendingUpload.intent
    : cachedAttachment;

  // Mutating the attachment also has to update the React Query cache,
  // otherwise the next page that reads the same query (e.g. the edit page)
  // would render with the stale attachment value.
  const setAttachment = (next: ExpenseAttachment | null) => {
    setAttachmentOverride(next);
    queryClient.setQueryData<EditExpenseInterface | null>(
      queryKeys.expense(expenseId),
      (current) =>
        current
          ? {
              ...current,
              expense: {
                ...current.expense,
                attachment: next,
                attachmentDataUrl: next
                  ? current.expense.attachmentDataUrl ?? "attached"
                  : null,
              },
            }
          : current
    );
    patchExpenseAttachmentInDashboard(
      queryClient,
      groupId,
      expenseId,
      Boolean(next)
    );
    void invalidateGroupDashboard(queryClient, groupId);
  };

  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isExpenseDeleteConfirmOpen, setIsExpenseDeleteConfirmOpen] = useState(false);
  const [isAttachmentDeleteConfirmOpen, setIsAttachmentDeleteConfirmOpen] = useState(false);
  const [attachmentSpinnerMessage, setAttachmentSpinnerMessage] = useState("");
  const headerIconButtonClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground/70 transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-foreground active:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:hover:bg-background/40";

  const handleDeleteExpense = async () => {
    setIsDeletingExpense(true);
    try {
      // If a background upload is still in flight there's no point letting
      // it finish (we're about to delete the expense). Drop the local
      // pending state and let any in-flight network request complete on
      // its own; the server-side cascade on expense delete handles cleanup.
      dismissAttachmentUpload(expenseId);

      // Only call delete-attachment if the SERVER actually has one.
      // `cachedAttachment` reflects the React Query cache (i.e. server
      // state), whereas `attachment` may be a local pending preview.
      if (cachedAttachment) {
        try {
          await deleteExpenseAttachment(expenseId);
        } catch (error) {
          // The attachment may already be gone (e.g. background delete
          // raced ahead). Swallow so we still get to delete the expense.
          console.error("delete attachment failed during expense delete:", error);
        }
      }
      await deleteExpense(expenseId);
      evictExpenseAfterUnmountRef.current = expenseId;
      invalidateGroupDashboard(queryClient, groupId);
      router.push(`/group/${groupId}`);
    } finally {
      setIsDeletingExpense(false);
      setIsExpenseDeleteConfirmOpen(false);
    }
  };

  const handleAttachmentFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateAttachmentFile(file);
    if (validationError) {
      return;
    }

    setAttachmentSpinnerMessage(
      attachment ? t("updatingAttachment") : t("uploadingAttachment")
    );

    let localAttachment: ExpenseAttachment | null = null;
    try {
      localAttachment = await readExpenseAttachmentFile(file);
      const savedAttachment = await saveExpenseAttachment(
        expenseId,
        localAttachment
      );
      setAttachment(savedAttachment);
      setIsViewerOpen(false);
    } catch (error) {
      console.error("save attachment failed:", error);
    } finally {
      // The server returns its own signed URL, so the local blob URL is no
      // longer needed and must be released to avoid leaking the underlying
      // File reference for the lifetime of the page.
      revokeAttachmentObjectUrl(localAttachment);
      setAttachmentSpinnerMessage("");
    }
  };

  const handleDeleteAttachment = async () => {
    setIsAttachmentDeleteConfirmOpen(false);
    setAttachmentSpinnerMessage(t("deletingAttachment"));

    try {
      await deleteExpenseAttachment(expenseId);
      setAttachment(null);
      setIsViewerOpen(false);
    } catch (error) {
      console.error("delete attachment failed:", error);
    } finally {
      setAttachmentSpinnerMessage("");
    }
  };



  const handleCategoryPatch = async (
    category: CategoryKey,
    subcategory: string
  ) => {
    if (!details) return;

    setIsUpdatingCategory(true);

    const updatedExpense = await patchExpenseCategory(
      expenseId,
      category,
      subcategory
    );

    if (updatedExpense) {
      // Update the React Query cache in place so the page reflects the new
      // category/subcategory immediately and the dashboard refetch (kicked
      // off below) is the only network call this action makes.
      queryClient.setQueryData<EditExpenseInterface | null>(
        ["expense", expenseId],
        (current) =>
          current
            ? {
                ...current,
                expense: {
                  ...current.expense,
                  category: updatedExpense.category,
                  subcategory: updatedExpense.subcategory,
                  updatedAt: updatedExpense.updatedAt,
                },
              }
            : current
      );
      invalidateGroupDashboard(queryClient, groupId);
    }

    setIsUpdatingCategory(false);
  };

  const participantRows = useMemo(() => {
    if (!details) return [];

    return details.expense.participants.map((participant: ExpenseParticipantsRequest) => ({
      ...participant,
      name: memberName(details.group.members, participant.userId, viewerMemberId, t("unknown")),
    }));
  }, [details, viewerMemberId, t]);

  if (loading) {
    return <ExpenseDetailsSkeleton />;
  }

  if (!details) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">{tCommon("expenseNotFound")}</p>
        <Button asChild>
          <Link href={`/group/${groupId}`}>{t("backToGroup")}</Link>
        </Button>
      </div>
    );
  }

  const { group, expense } = details;
  const categoryColor =
    EXPENSE_CATEGORIES[expense.category as CategoryKey]?.color ||
    "category-uncategorized";
  const IconComponent = getCategoryIcon(
    expense.category as CategoryKey,
    expense.subcategory
  );
  const showCategoryPatch =
    expense.category === "uncategorized" && expense.subcategory === "general";
  const isSettlementExpense = expense.category === "settlement";
  const payers = expense.payers?.length
    ? expense.payers.map((payer) => ({
        userId: payer.userId,
        name: memberName(group.members, payer.userId, viewerMemberId, t("unknown")),
        amount: payer.amount,
      }))
    : [
        {
          userId: expense.paidByUserId,
          name: memberName(group.members, expense.paidByUserId, viewerMemberId, t("unknown")),
          amount: expense.amount,
        },
      ];
  const netSettlements = calculateExpenseSettlements(
    group.members,
    payers.map(({ userId, amount }) => ({ userId, amount })),
    expense.participants,
    t("unknown")
  );
  const owedRows = participantRows.map((participant) => ({
    userId: participant.userId,
    name: formatSummaryName(participant.name),
    amount: Number(participant.amount) || 0,
  }));
  const isImageAttachment = attachment?.type.startsWith("image/");
  const safeNotes = expense.notes ? sanitizeExpenseNotes(expense.notes) : "";
  const hasNotes = safeNotes
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim().length > 0;
  const createdAtLabel = getDateTimeMs(expense.createdAt) !== null
    ? formatDisplayDateTime(expense.createdAt)
    : "";
  const updatedAtLabel = shouldShowUpdatedAt(
    expense.createdAt,
    expense.updatedAt
  )
    ? formatDisplayDateTime(expense.updatedAt)
    : "";
  const attachmentActionButtonClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground/70 transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-foreground active:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:hover:bg-muted";
  const attachmentActionsDisabled =
    Boolean(attachmentSpinnerMessage) || isAttachmentUploading;
  const attachmentActions = (
    <>
      <button
        type="button"
        onClick={() => attachmentInputRef.current?.click()}
        aria-label={attachment ? t("replaceAttachment") : t("uploadAttachment")}
        className={attachmentActionButtonClass}
        disabled={attachmentActionsDisabled}
      >
        {attachment ? (
          <Pencil className="h-5 w-5" />
        ) : (
          <ImagePlus className="h-5 w-5" />
        )}
      </button>
      {attachment && (
        <button
          type="button"
          onClick={() => setIsAttachmentDeleteConfirmOpen(true)}
          aria-label={t("deleteAttachment")}
          className={attachmentActionButtonClass}
          disabled={attachmentActionsDisabled}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}
    </>
  );

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <input
        ref={attachmentInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAttachmentFileChange}
      />
      <div className="mx-auto flex h-full max-w-3xl flex-col">
        <header
          className="relative shrink-0 border-b px-3 sm:px-4"
          style={{ backgroundColor: `hsl(var(--${categoryColor}) / 0.18)` }}
        >
          <div className="flex h-14 items-center justify-between">
            <Link
              href={`/group/${groupId}`}
              aria-label={t("backToGroup")}
              className={headerIconButtonClass}
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-1 text-foreground/70">
              {!attachment && (
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  aria-label={t("uploadAttachment")}
                  className={headerIconButtonClass}
                  disabled={attachmentActionsDisabled}
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              )}
              <Link
                href={`/group/${groupId}/edit-expense/${expenseId}`}
                aria-label={t("editExpenseAria")}
                className={headerIconButtonClass}
              >
                <Pencil className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={() => setIsExpenseDeleteConfirmOpen(true)}
                aria-label={t("deleteExpenseAria")}
                className={headerIconButtonClass}
                disabled={isDeletingExpense}
              >
                {isDeletingExpense ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-[-24px] left-[5rem]">
            {showCategoryPatch ? (
              <div className="pointer-events-auto">
                <SingleSelect
                  groups={Object.entries(EXPENSE_CATEGORIES).map(([key, category]) => ({
                    id: key,
                    label: category.label,
                    color: category.color,
                    subOptions: category.subcategories.map((sub) => ({
                      id: sub.id,
                      label: sub.label,
                      icon: sub.icon,
                    })),
                  }))}
                  value={{ groupId: expense.category, itemId: expense.subcategory }}
                  onSelect={(groupId, itemId) =>
                    handleCategoryPatch(groupId as CategoryKey, itemId)
                  }
                  inputPlaceholder={t("searchCategory")}
                  fullscreenOnMobile
                  disabled={isUpdatingCategory}
                  trigger={
                    <button
                      type="button"
                      disabled={isUpdatingCategory}
                      className="inline-flex h-12 items-center gap-1 rounded-md border border-foreground/15 bg-background/95 px-2.5 text-foreground shadow-sm disabled:opacity-60"
                      aria-label={t("patchCategory")}
                    >
                      <IconComponent
                        className="h-8 w-8"
                        style={{ color: `hsl(var(--${categoryColor}))` }}
                      />
                      {isUpdatingCategory ? (
                        <Check className="h-4 w-4 opacity-60" />
                      ) : (
                        <ChevronDown className="h-4 w-4 opacity-70" />
                      )}
                    </button>
                  }
                />
              </div>
            ) : (
              <IconComponent
                className="h-16 w-16"
                style={{ color: `hsl(var(--${categoryColor}))` }}
              />
            )}
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 pt-10">
          <section className="shrink-0">
            <div className="flex items-start gap-3">
              {attachment && (
                <button
                  type="button"
                  className="mt-1 block shrink-0"
                  aria-label={
                    isAttachmentUploading ? t("uploadingAttachment") : t("openAttachment")
                  }
                  onClick={() => {
                    if (!isAttachmentUploading) setIsViewerOpen(true);
                  }}
                  disabled={isAttachmentUploading}
                >
                  <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-sm border bg-black/5">
                    {isImageAttachment ? (
                      <Image
                        src={attachment.url}
                        alt={attachment.name}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    )}
                    {isAttachmentUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                    {pendingUpload?.status === "error" && (
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-destructive/40"
                        title={pendingUpload.error ?? t("failedSaveAttachment")}
                      >
                        <AlertCircle className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              )}

              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words text-2xl font-semibold leading-tight [overflow-wrap:anywhere]">
                  {expense.description}
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-normal">
                  {formatAmount(expense.amount, expense.currency)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {t("expenseDate", { date: formatDisplayDate(expense.date) })}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {t("splitCount", { count: participantRows.length })}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {createdAtLabel ? <p>{t("addedOn", { date: createdAtLabel })}</p> : null}
                  {updatedAtLabel ? <p>{t("updatedOn", { date: updatedAtLabel })}</p> : null}
                </div>
              </div>
            </div>
          </section>

          <section className="grid shrink-0 gap-3 overflow-visible md:grid-cols-[1fr_0.85fr]">
            <div className="h-auto overflow-visible rounded-lg border bg-card p-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  {payers.map((payer) => (
                    <div key={`payer-${payer.userId}`} className="flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-2 text-sm">
                        <span className="truncate font-medium">
                          {formatSummaryName(payer.name)}{" "}
                          <span className="font-normal text-muted-foreground">{t("paidLabel")}</span>
                        </span>
                      </div>
                      <span className="shrink-0 font-medium">
                        {formatAmount(payer.amount, expense.currency)}
                      </span>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {expense.splitType === "equal"
                      ? t("splitEquallyLabel")
                      : expense.splitType === "percentage"
                        ? t("splitByPercentage")
                        : t("splitUnequally")}
                  </div>
                </div>

                <div className="h-px bg-border" />

                <div className="space-y-3">
                  {owedRows.length > 0 ? (
                    owedRows.map((participant) => (
                      <div
                        key={`owed-${participant.userId ?? participant.name}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-2 text-sm">
                          <span className="truncate font-medium">
                            {participant.name}{" "}
                            <span className="font-normal text-muted-foreground">{t("owedLabel")}</span>
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-medium">
                          {formatAmount(participant.amount, expense.currency)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {isSettlementExpense ? t("settlementBalanced") : t("noOneOwes")}
                    </div>
                  )}
                </div>

                {/* {netSettlements.length > 0 && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
                      {netSettlements.map((settlement) => (
                        <div
                          key={`${settlement.fromId}-${settlement.toId}-${settlement.amount}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                            <span className="truncate">
                              {formatSummaryName(settlement.fromName)} owes {formatSummaryName(settlement.toName)}
                            </span>
                          </div>
                          <span className="shrink-0 text-sm font-medium">
                            {formatAmount(settlement.amount, expense.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )} */}
              </div>
            </div>

          </section>

          {hasNotes && (
            <section className="shrink-0 rounded-lg border bg-card p-4">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <NotebookPen className="h-4 w-4 text-muted-foreground" />
                {t("notesLabel")}
              </h2>
              <div
                className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere] [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                dangerouslySetInnerHTML={{ __html: safeNotes }}
              />
            </section>
          )}

        </main>

        <ExpenseAttachmentViewer
          attachment={attachment}
          open={isViewerOpen && Boolean(attachment)}
          onOpenChange={setIsViewerOpen}
          actions={attachmentActions}
        />
        <AlertDialog
          open={isAttachmentDeleteConfirmOpen}
          onOpenChange={setIsAttachmentDeleteConfirmOpen}
        >
          <AlertDialogContent className="max-w-[290px] rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg">{t("deleteImageTitle")}</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                {t("deleteImageDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 flex-row gap-2">
              <AlertDialogCancel className="mt-0 flex-1 rounded-xl border-none bg-muted hover:bg-muted/80">
                {tCommon("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAttachment}
                disabled={Boolean(attachmentSpinnerMessage)}
                className="flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90"
              >
                {tCommon("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={isExpenseDeleteConfirmOpen}
          onOpenChange={setIsExpenseDeleteConfirmOpen}
        >
          <AlertDialogContent className="max-w-[290px] rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg">{t("deleteExpenseTitle")}</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                {t("deleteExpenseDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 flex-row gap-2">
              <AlertDialogCancel className="mt-0 flex-1 rounded-xl border-none bg-muted hover:bg-muted/80">
                {tCommon("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteExpense}
                disabled={isDeletingExpense}
                className="flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeletingExpense ? tCommon("deleting") : tCommon("delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <Spinner
        show={Boolean(attachmentSpinnerMessage)}
        className="z-[100]"
        message={attachmentSpinnerMessage}
      />
    </div>
  );
}
