"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  FileText,
  ImageOff,
  ImagePlus,
  Images,
  Loader2,
  NotebookPen,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GenericAlertDialog, type AlertActionResult } from "@/components/ui/generic-alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ExpenseAttachmentViewer } from "@/components/expense/ExpenseAttachmentViewer";
import { Spinner } from "@/components/ui/Spinner";
import {
  getCategoryIcon,
  EXPENSE_CATEGORIES,
  type CategoryKey,
  type SubcategoryId,
} from "@/components/icons/CategoryIcons";
import {
  deleteExpense,
  EditExpenseInterface,
  isGroupDeleted,
  patchExpenseCategory,
  ExpenseParticipantsRequest,
} from "@/lib/storage";
import { GroupDeletedDialog } from "@/components/group/GroupDeletedDialog";
import { ExpenseNotFound } from "@/components/expense/ExpenseNotFound";
import {
  formatAmount,
  formatDisplayDate,
  formatDisplayDateTime,
} from "@/components/ui/formatters";
import {
  deleteExpenseAttachment,
  ExpenseAttachment,
  MAX_ATTACHMENT_SIZE_LABEL,
  readExpenseAttachmentFile,
  revokeAttachmentObjectUrl,
  saveExpenseAttachment,
  validateAttachmentFile,
} from "@/lib/expenseAttachments";
import { useExpense } from "@/lib/groupExpenseData";
import { ExpenseHistory } from "@/components/activity/ExpenseHistory";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { deleteCachedExpense } from "@/lib/offline/cache";
import { useExpenseRealtime, useGroupChanges } from "@/hooks/useGroupRealtime";
import { useGroupChangeNotices } from "@/components/group/GroupChangeNotices";
import { useReceiptChangeNotice } from "@/components/expense/useReceiptChangeNotice";
import { applyGroupChangesToGroup } from "@/lib/realtime/groupChanges";
import type { ReceiptChange } from "@/lib/realtime/expenseChanges";
import { getGroupViewerMemberId } from "@/lib/groupViewer";
import { memberNameForViewer } from "@/lib/groupExpenseLabels";
import { formatSummaryName } from "@/components/ui/formatters";
import {
  dismissAttachmentUpload,
  useAttachmentUpload,
} from "@/lib/attachmentUploads";
import { Skeleton } from "@/components/ui/skeleton";
import { SingleSelect } from "@/components/ui/single-select";
import { hasExpenseNotesContent, sanitizeExpenseNotes } from "@/lib/expenseNotes";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import { toast } from "@/hooks/use-toast";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import { getTranslatedSubcategoryLabel, resolveCategoryDisplayLabel } from "@/lib/category-labels";
import { GuardedLink } from "@/components/sync/GuardedLink";
import { OfflineBanner } from "@/components/sync/OfflineBanner";
import { SyncStatusButton } from "@/components/sync/SyncStatus";
import { useGroupAccess, useOfflineFailureToast } from "@/hooks/useOffline";
import { cn } from "@/lib/utils";

function memberName(
  members: EditExpenseInterface["group"]["members"],
  userId: string | null,
  viewerMemberId: string | null,
  unknownLabel: string,
  youLabel?: string
) {
  if (!userId) return unknownLabel;
  const m = members.find((member) => member.id === userId);
  if (!m) return unknownLabel;
  return memberNameForViewer(m.id, m.name, viewerMemberId, youLabel);
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
  const t = useTranslations("expense");
  const tToasts = useTranslations("toasts");
  const tCommon = useTranslations("common");
  const tConflict = useTranslations("editConflict");
  const tReceipt = useTranslations("receiptChanges");
  const tCategories = useTranslations("categories");
  const tOffline = useTranslations("offline");
  // The same translated word for "you" as the dashboard uses.
  const youLabel = useTranslations("group")("you");
  const attachmentGalleryInputRef = useRef<HTMLInputElement>(null);
  const attachmentCameraInputRef = useRef<HTMLInputElement>(null);

  const { data: details, loading, refresh, setData: setDetails, applyChange } = useExpense(expenseId);
  const access = useGroupAccess(groupId);
  const showOfflineFailure = useOfflineFailureToast();
  const openAttachmentSource = () => {
    if (access.check("attachment")) setIsAttachmentSourceOpen(true);
  };

  const [viewerMemberId, setViewerMemberId] = useState<string | null>(null);
  useEffect(() => {
    setViewerMemberId(getGroupViewerMemberId(groupId));
  }, [groupId]);

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

  const setAttachment = (next: ExpenseAttachment | null) => {
    setAttachmentOverride(next);
    setDetails(
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
  };

  const [isDeletingExpense, setIsDeletingExpense] = useState(false);
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false);
  // Someone else changed the category between this screen loading and the
  // user's pick: `mine` is what they picked, `current` what is stored now.
  type CategoryConflict = {
    mine: { category: CategoryKey; subcategory: string };
    current: { category: CategoryKey; subcategory: string };
  };
  const [categoryConflict, setCategoryConflict] = useState<CategoryConflict | null>(null);
  // Mirrors the state synchronously: a dialog button's click is followed by
  // onOpenChange(false) in the same event, and only the first may resolve it.
  const categoryConflictRef = useRef<CategoryConflict | null>(null);
  const openCategoryConflict = (conflict: CategoryConflict) => {
    categoryConflictRef.current = conflict;
    setCategoryConflict(conflict);
  };
  const takeCategoryConflict = () => {
    const conflict = categoryConflictRef.current;
    categoryConflictRef.current = null;
    setCategoryConflict(null);
    return conflict;
  };
  // Keeps the dialog's wording steady while it animates closed.
  const shownCategoryConflictRef = useRef<CategoryConflict | null>(null);
  if (categoryConflict) shownCategoryConflictRef.current = categoryConflict;
  const shownCategoryConflict = shownCategoryConflictRef.current;
  // Names a side of the conflict; when both are in the same category only the
  // subcategory tells them apart.
  const conflictCategoryLabel = (side: "mine" | "current") => {
    if (!shownCategoryConflict) return "";
    const { category, subcategory } = shownCategoryConflict[side];
    const other = shownCategoryConflict[side === "mine" ? "current" : "mine"];
    return category === other.category && category in EXPENSE_CATEGORIES
      ? getTranslatedSubcategoryLabel(tCategories, category, subcategory as SubcategoryId)
      : resolveCategoryDisplayLabel(tCategories, category);
  };
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isAttachmentSourceOpen, setIsAttachmentSourceOpen] = useState(false);
  const [isExpenseDeleteConfirmOpen, setIsExpenseDeleteConfirmOpen] = useState(false);
  const [isAttachmentDeleteConfirmOpen, setIsAttachmentDeleteConfirmOpen] = useState(false);
  const [attachmentSpinnerMessage, setAttachmentSpinnerMessage] = useState("");
  const [deletedOpen, setDeletedOpen] = useState(false);
  // Someone replaced the receipt the user was deleting: the delete dialog then
  // asks whether to delete the new one too. It is the same dialog, not a second
  // one, because closing one dialog while opening another in the same moment
  // fights over the Back-button history and closes the new one at once.
  const [receiptReplaced, setReceiptReplaced] = useState(false);
  // Keeps the dialog's wording steady while it animates closed.
  const shownReceiptReplacedRef = useRef(false);
  if (isAttachmentDeleteConfirmOpen) shownReceiptReplacedRef.current = receiptReplaced;
  // This tab removed the receipt, so if someone adds a new one right after, the
  // user is told (otherwise a receipt appearing explains itself).
  const deletedReceiptHereRef = useRef(false);
  const noticeReceiptChange = useReceiptChangeNotice();

  useBackButtonClose(isAttachmentSourceOpen, () =>
    setIsAttachmentSourceOpen(false)
  );

  // The whole group was deleted; replaces the expense-level "deleted" dialog.
  const [groupDeleted, setGroupDeleted] = useState(false);
  const showGroupDeleted = () => {
    setGroupDeleted(true);
    setDeletedOpen(false);
  };

  // Set while this tab is deleting the expense, so the broadcast of that delete
  // (ours, or one from someone deleting it at the same moment) doesn't open the
  // "Expense deleted" dialog on top of the toast and the move back to the group.
  const isOwnDeleteRef = useRef(false);

  // The receipt was changed in another session: say what happened to whatever
  // the user is looking at or about to delete. The refetch in the handler below
  // brings in the latest receipt itself.
  const handleRemoteReceiptChange = (receipt: ReceiptChange) => {
    if (receipt === "removed") {
      // Nothing left to view or delete.
      setIsViewerOpen(false);
      setIsAttachmentDeleteConfirmOpen(false);
      noticeReceiptChange("removed");
      return;
    }
    if (receipt === "replaced") {
      if (isAttachmentDeleteConfirmOpen) {
        // The receipt being deleted is no longer the one stored.
        setReceiptReplaced(true);
      } else {
        // Don't swap the image under someone zooming into it: close the viewer
        // and let them reopen the new one.
        setIsViewerOpen(false);
        noticeReceiptChange("replaced");
      }
      return;
    }
    if (deletedReceiptHereRef.current) {
      deletedReceiptHereRef.current = false;
      noticeReceiptChange("added");
    }
  };

  useExpenseRealtime(expenseId, (event, _revision, receipt) => {
    if (event === "DELETE") {
      if (isOwnDeleteRef.current) return;
      // Deleting a group deletes its expenses too; check which one happened.
      void isGroupDeleted(groupId).then((gone) => {
        if (gone) {
          showGroupDeleted();
          return;
        }
        // Drop it from the saved dashboard too, so going back doesn't list it.
        void deleteCachedExpense(expenseId);
        setDeletedOpen(true);
      });
      return;
    }
    // Drop any locally-set attachment override so a remote change (e.g. the
    // image being deleted from another tab) isn't masked by a stale local
    // value once the refetch below lands.
    setAttachmentOverride(undefined);
    void refresh();
    if (receipt) handleRemoteReceiptChange(receipt);
  });

  // Names on this screen come from the group's member list, so a member or
  // group edit is applied to it in place instead of refetching.
  const changeNotices = useGroupChangeNotices();
  useGroupChanges(
    groupId,
    (changes) => {
      applyChange((prev) => ({ ...prev, group: applyGroupChangesToGroup(prev.group, changes) }), changes.revision);
      changeNotices.notify(changes);
    },
    showGroupDeleted
  );

  const headerIconButtonClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground/70 transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-foreground active:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:hover:bg-background/40";

  /** Resolves false on failure, so the confirm dialog unlocks and closes. */
  const handleDeleteExpense = async (): Promise<boolean> => {
    setIsDeletingExpense(true);
    isOwnDeleteRef.current = true;
    try {
      // If a background upload is still in flight there's no point letting
      // it finish (we're about to delete the expense). Drop the local
      // pending state and let any in-flight network request complete on
      // its own; the server-side cascade on expense delete handles cleanup.
      dismissAttachmentUpload(expenseId);

      // The server removes the receipt file along with the expense. Removing it
      // here first would tell everyone else viewing the expense "receipt
      // removed", and their page would reload into "not found" before the
      // "Expense deleted" notice could show.
      // deleteExpense reports failure as `false`; a failed delete must not
      // navigate away as if it had worked.
      if (!(await deleteExpense(expenseId))) throw new Error("Failed to delete expense");
      toast({ message: tToasts("expenseDeleted"), variant: "destructive" });
      // Leave the dialog open and locked until the page navigates away, so it
      // doesn't close onto the expense that was just deleted.
      router.push(`/group/${groupId}`);
      return true;
    } catch (error) {
      // Still here, so the expense may still exist: let later deletes be reported.
      isOwnDeleteRef.current = false;
      setIsDeletingExpense(false);
      if (showOfflineFailure(error, tOffline("droppedNotDeleted"))) return false;
      console.error("delete expense failed:", error);
      toast({
        title: tToasts("couldNotDeleteExpense"),
        description: tToasts("tryAgainHint"),
        variant: "error",
        action: { label: tToasts("retry"), callback: () => void handleDeleteExpense() },
      });
      return false;
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
      // Say why nothing happened instead of silently ignoring the pick.
      toast({
        message: file.type.startsWith("image/")
          ? t("attachMaxSize", { max: MAX_ATTACHMENT_SIZE_LABEL })
          : t("attachImageOnly"),
        variant: "error",
      });
      return;
    }

    await uploadAttachmentFile(file);
  };

  /** Uploads a picked image; kept separate so a failed upload can retry the same file. */
  const uploadAttachmentFile = async (file: File) => {
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
      deletedReceiptHereRef.current = false;
    } catch (error) {
      if ((error as { code?: string }).code === "EXPENSE_DELETED") {
        // The expense was deleted while the image uploaded: retrying can't help.
        void isGroupDeleted(groupId).then((gone) => (gone ? showGroupDeleted() : setDeletedOpen(true)));
        return;
      }
      if (showOfflineFailure(error, tOffline("droppedReceipt"))) return;
      console.error("save attachment failed:", error);
      toast({
        title: tToasts("couldNotUploadImage"),
        description: tToasts("tryAgainHint"),
        variant: "error",
        action: { label: tToasts("retry"), callback: () => void uploadAttachmentFile(file) },
      });
    } finally {
      // The server returns its own signed URL, so the local blob URL is no
      // longer needed and must be released to avoid leaking the underlying
      // File reference for the lifetime of the page.
      revokeAttachmentObjectUrl(localAttachment);
      setAttachmentSpinnerMessage("");
    }
  };

  /**
   * Deletes the receipt the user is looking at. If someone has replaced it in
   * the meantime the server leaves their newer one alone and the user is asked
   * whether to delete that too; `deleteNewer` answers yes.
   */
  const deleteReceipt = async (deleteNewer: boolean): Promise<AlertActionResult> => {
    // The confirm dialog stays open and locked while this runs; its Delete
    // button shows the progress.
    try {
      await deleteExpenseAttachment(expenseId, deleteNewer ? undefined : cachedAttachment?.name);
      deletedReceiptHereRef.current = true;
      setAttachment(null);
      setIsViewerOpen(false);
      setReceiptReplaced(false);
      return true;
    } catch (error) {
      if ((error as { code?: string }).code === "ATTACHMENT_CHANGED") {
        // Show the newer receipt behind the question; the dialog turns into it.
        setAttachmentOverride(undefined);
        void refresh();
        setReceiptReplaced(true);
        return "stay";
      }
      setReceiptReplaced(false);
      if (showOfflineFailure(error, tOffline("droppedReceipt"))) return false;
      console.error("delete attachment failed:", error);
      toast({ title: tToasts("couldNotRemoveImage"), description: tToasts("tryAgainHint"), variant: "error" });
      return false;
    }
  };



  /** `expected` is the category the pick replaces; defaults to what is on screen. */
  const handleCategoryPatch = async (
    category: CategoryKey,
    subcategory: string,
    expected = details
      ? { category: details.expense.category, subcategory: details.expense.subcategory }
      : null
  ) => {
    if (!details || !expected) return;

    setIsUpdatingCategory(true);

    try {
      const updatedExpense = await patchExpenseCategory(
        expenseId,
        category,
        subcategory,
        expected
      );

      if (updatedExpense) {
        // Keep the category selection in the currently displayed detail data.
        setDetails(
          (current) =>
            current
              ? {
                  ...current,
                  expense: {
                    ...current.expense,
                    category: updatedExpense.category,
                    subcategory: updatedExpense.subcategory,
                    updatedAt: updatedExpense.updatedAt,
                    revision: updatedExpense.revision ?? current.expense.revision,
                  },
                }
              : current
        );
      }
    } catch (error) {
      const failure = error as {
        code?: string;
        payload?: { currentCategory?: CategoryKey; currentSubcategory?: string };
      };
      if (failure.code === "EXPENSE_CATEGORY_CONFLICT" && failure.payload?.currentCategory) {
        openCategoryConflict({
          mine: { category, subcategory },
          current: {
            category: failure.payload.currentCategory,
            subcategory: failure.payload.currentSubcategory ?? "general",
          },
        });
        return;
      }
      if (failure.code === "EXPENSE_DELETED") {
        // Deleting a group deletes its expenses too; check which one happened.
        void isGroupDeleted(groupId).then((gone) => (gone ? showGroupDeleted() : setDeletedOpen(true)));
        return;
      }
      if (showOfflineFailure(error)) return;
      const message = error instanceof Error ? error.message : "Failed to update expense category";
      const isProduction = process.env.NODE_ENV === "production";
      toast({
        title: isProduction ? "Could not update category" : "Category update failed",
        description: isProduction
          ? "Please try again. If the problem persists, contact support."
          : message,
        variant: "error",
      });
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  // "Use Travel" (or dismissing): show what is stored now.
  const handleUseCurrentCategory = () => {
    if (!takeCategoryConflict()) return;
    void refresh();
  };

  // "Apply Shopping": pick again, this time knowingly replacing the stored one.
  const handleApplyMyCategory = () => {
    const conflict = takeCategoryConflict();
    if (!conflict) return;
    void handleCategoryPatch(conflict.mine.category, conflict.mine.subcategory, conflict.current);
  };

  const participantRows = useMemo(() => {
    if (!details) return [];

    return details.expense.participants.map((participant: ExpenseParticipantsRequest) => ({
      ...participant,
      name: memberName(details.group.members, participant.userId, viewerMemberId, t("unknown"), youLabel),
    }));
  }, [details, viewerMemberId, t, youLabel]);

  if (loading) {
    return <ExpenseDetailsSkeleton />;
  }

  if (!details) {
    return <ExpenseNotFound groupId={groupId} loading={<ExpenseDetailsSkeleton />} />;
  }

  if (details.group.id !== groupId) {
    return (
      <ResourceNotFound
        message={tCommon("groupNotFound")}
        actionLabel={tCommon("goHome")}
        actionHref="/"
      />
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
        name: memberName(group.members, payer.userId, viewerMemberId, t("unknown"), youLabel),
        amount: payer.amount,
      }))
    : [
        {
          userId: expense.paidByUserId,
          name: memberName(group.members, expense.paidByUserId, viewerMemberId, t("unknown"), youLabel),
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
  // One payer and one person in the split is common (settle up, paying for or
  // lending to someone, or an expense just for yourself): say it in one line
  // instead of a split. Anything with more of either shows the full split card.
  const hasOneOfEach = payers.length === 1 && owedRows.length === 1;
  const isPaidForOne = hasOneOfEach && payers[0].userId !== owedRows[0].userId;
  const isPaidForSelf = hasOneOfEach && payers[0].userId === owedRows[0].userId;
  // With nobody or just one person in the split there is nothing to split, so
  // the "Split between N people" chip and the "Split equally" line would only
  // be noise.
  const hideSplit = owedRows.length <= 1;
  const receiverIsViewer = Boolean(viewerMemberId && owedRows[0]?.userId === viewerMemberId);
  const isImageAttachment = attachment?.type.startsWith("image/");
  // The expense has a receipt, but its (short-lived) link isn't saved on the
  // device, so offline it can't be shown. Say so rather than look receipt-less.
  const receiptUnavailable = !attachment && !pendingUpload && Boolean(expense.attachmentDataUrl);
  const safeNotes = expense.notes ? sanitizeExpenseNotes(expense.notes) : "";
  const hasNotes = hasExpenseNotesContent(safeNotes);
  const createdAtLabel = getDateTimeMs(expense.createdAt) !== null
    ? formatDisplayDateTime(expense.createdAt)
    : "";
  const updatedAtLabel = shouldShowUpdatedAt(
    expense.createdAt,
    expense.updatedAt
  )
    ? formatDisplayDateTime(expense.updatedAt)
    : "";
  const attachmentActionButtonClass = cn(
    "inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground/70 transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-foreground active:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:hover:bg-muted",
    !access.can.attachment && "opacity-50"
  );
  const attachmentActionsDisabled =
    Boolean(attachmentSpinnerMessage) || isAttachmentUploading;
  const attachmentActions = (
    <>
      <button
        type="button"
        onClick={openAttachmentSource}
        aria-label={attachment ? t("replaceAttachment") : t("uploadAttachment")}
        aria-disabled={access.can.attachment ? undefined : true}
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
          onClick={() => {
            if (access.check("attachment")) setIsAttachmentDeleteConfirmOpen(true);
          }}
          aria-label={t("deleteAttachment")}
          aria-disabled={access.can.attachment ? undefined : true}
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
        ref={attachmentGalleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAttachmentFileChange}
      />
      <input
        ref={attachmentCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleAttachmentFileChange}
      />
      <Drawer
        open={isAttachmentSourceOpen}
        onOpenChange={setIsAttachmentSourceOpen}
      >
        <DrawerContent className="rounded-t-3xl border-x-0 border-b-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl [&>div:first-child]:hidden">
          <div className="mx-auto w-full max-w-md">
            <DrawerTitle className="sr-only">{t("imageSourceTitle")}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {t("imageSourceDescription")}
            </DrawerDescription>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  attachmentCameraInputRef.current?.click();
                  setIsAttachmentSourceOpen(false);
                }}
                className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-primary px-3 text-primary-foreground shadow-sm transition-transform active:scale-[0.97]"
              >
                <Camera className="h-5 w-5" />
                <span className="text-sm font-semibold">{t("takePhoto")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  attachmentGalleryInputRef.current?.click();
                  setIsAttachmentSourceOpen(false);
                }}
                className="flex h-14 items-center justify-center gap-2.5 rounded-2xl border bg-muted/60 px-3 text-foreground transition-transform hover:bg-muted active:scale-[0.97]"
              >
                <Images className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">
                  {t("chooseFromGallery")}
                </span>
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
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
              {/* As big as the header's other buttons, so it needs no wider tap area
                  (which would overlap the button next to it). */}
              <SyncStatusButton className="h-10 w-10 before:hidden" />
              {!attachment && !receiptUnavailable && (
                <button
                  type="button"
                  onClick={openAttachmentSource}
                  aria-label={t("uploadAttachment")}
                  aria-disabled={access.can.attachment ? undefined : true}
                  className={cn(headerIconButtonClass, !access.can.attachment && "opacity-50")}
                  disabled={attachmentActionsDisabled}
                >
                  <ImagePlus className="h-5 w-5" />
                </button>
              )}
              <GuardedLink
                href={`/group/${groupId}/edit-expense/${expenseId}`}
                allowed={access.can.edit}
                onBlocked={() => access.check("edit")}
                aria-label={t("editExpenseAria")}
                className={headerIconButtonClass}
              >
                <Pencil className="h-5 w-5" />
              </GuardedLink>
              <button
                type="button"
                onClick={() => {
                  if (access.check("edit")) setIsExpenseDeleteConfirmOpen(true);
                }}
                aria-label={t("deleteExpenseAria")}
                aria-disabled={access.can.edit ? undefined : true}
                className={cn(headerIconButtonClass, !access.can.edit && "opacity-50")}
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
                  onSelect={(groupId, itemId) => {
                    if (access.check("edit")) void handleCategoryPatch(groupId as CategoryKey, itemId);
                  }}
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
          <OfflineBanner groupId={groupId} access={access} className="shrink-0" />
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
              {receiptUnavailable && (
                <button
                  type="button"
                  className="mt-1 block shrink-0"
                  aria-label={tOffline("receiptOffline")}
                  title={tOffline("receiptOffline")}
                  onClick={() => toast({ message: tOffline("receiptOffline"), variant: "info", duration: 3_000 })}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-dashed bg-muted/50">
                    <ImageOff className="h-6 w-6 text-muted-foreground" aria-hidden />
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
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    <span className="sr-only">{isSettlementExpense ? t("settlementDateLabel") : t("expenseDateLabel")}</span>
                    {t("expenseDate", { date: formatDisplayDate(expense.date) })}
                  </span>
                  {hideSplit ? null : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1">
                      <Users className="h-3.5 w-3.5" />
                      {t("splitCount", { count: participantRows.length })}
                    </span>
                  )}
                </div>
                {/* A group that so far lives only on this device has no history to open. */}
                {access.isLocal ? (
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {createdAtLabel ? <p>{t("addedOn", { date: createdAtLabel })}</p> : null}
                    {updatedAtLabel ? <p>{t("updatedOn", { date: updatedAtLabel })}</p> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid shrink-0 gap-3 overflow-visible md:grid-cols-[1fr_0.85fr]">
            <div className="h-auto overflow-visible rounded-lg border bg-card p-4">
              {isPaidForOne ? (
                // One person paid for one other person: say so in a line, without a split.
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5 text-sm">
                    <UserAvatar name={payers[0].name} size="sm" disableMobileTooltip />
                    {/* Wraps rather than truncates: the end of the sentence is who it was for. */}
                    <span className="min-w-0 break-words font-medium leading-snug">
                      {t.rich(isSettlementExpense ? "settlementPaid" : "paidForOne", {
                        payer: formatSummaryName(payers[0].name),
                        receiver: owedRows[0].name,
                        receiverIsYou: String(receiverIsViewer),
                        muted: (chunks) => <span className="font-normal text-muted-foreground">{chunks}</span>,
                      })}
                    </span>
                  </div>
                  <span className="shrink-0 font-medium">{formatAmount(payers[0].amount, expense.currency)}</span>
                </div>
              ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {payers.map((payer) => (
                    <div key={`payer-${payer.userId}`} className="flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-2.5 text-sm">
                        <UserAvatar name={payer.name} size="sm" disableMobileTooltip />
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

                  {hideSplit ? null : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {expense.splitType === "equal"
                        ? t("splitEquallyLabel")
                        : expense.splitType === "percentage"
                          ? t("splitByPercentage")
                          : t("splitUnequally")}
                    </div>
                  )}
                </div>

                {isPaidForSelf ? null : <div className="h-px bg-border" />}

                <div className={cn("space-y-3", isPaidForSelf && "hidden")}>
                  {owedRows.length > 0 ? (
                    owedRows.map((participant) => (
                      <div
                        key={`owed-${participant.userId ?? participant.name}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-2 text-sm">
                          <span className="truncate font-medium">
                            {t.rich("shareOf", {
                              name: participant.name,
                              isYou: String(Boolean(viewerMemberId && participant.userId === viewerMemberId)),
                              muted: (chunks) => <span className="font-normal text-muted-foreground">{chunks}</span>,
                            })}
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
              )}
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

          {!access.isLocal && <ExpenseHistory
            expenseId={expenseId}
            currency={expense.currency}
            createdAt={expense.createdAt}
            isSettlement={isSettlementExpense}
            // Shows at once, before the history loads (and offline).
            updatedAt={updatedAtLabel ? expense.updatedAt : null}
            // Receipt changes don't bump revision/updatedAt, so key on the saved attachment too.
            refreshKey={`${expense.revision ?? ""}|${expense.updatedAt ?? ""}|${
              cachedAttachment?.updatedAt ?? "none"
            }`}
          />}

        </main>

        <ExpenseAttachmentViewer
          attachment={attachment}
          open={isViewerOpen && Boolean(attachment)}
          onOpenChange={setIsViewerOpen}
          actions={attachmentActions}
        />
        <GenericAlertDialog
          open={isAttachmentDeleteConfirmOpen}
          onOpenChange={(open) => {
            setIsAttachmentDeleteConfirmOpen(open);
            if (!open) setReceiptReplaced(false);
          }}
          title={shownReceiptReplacedRef.current ? tReceipt("replacedDialogTitle") : t("deleteImageTitle")}
          description={shownReceiptReplacedRef.current ? tReceipt("replacedDialogDescription") : t("deleteImageDescription")}
          actions={
            shownReceiptReplacedRef.current
              ? [
                  { label: tReceipt("keepNew"), type: "cancel", className: "mt-0 flex-1 border-none bg-muted hover:bg-muted/80" },
                  { label: tReceipt("deleteAnyway"), pendingLabel: tCommon("deleting"), onClick: () => deleteReceipt(true), async: true, variant: "destructive", className: "flex-1" },
                ]
              : [
                  { label: tCommon("cancel"), type: "cancel", className: "mt-0 flex-1 border-none bg-muted hover:bg-muted/80" },
                  { label: tCommon("delete"), pendingLabel: tCommon("deleting"), onClick: () => deleteReceipt(false), async: true, disabled: Boolean(attachmentSpinnerMessage), variant: "destructive", className: "flex-1" },
                ]
          }
        />
        <GenericAlertDialog
          open={isExpenseDeleteConfirmOpen}
          onOpenChange={setIsExpenseDeleteConfirmOpen}
          title={t("deleteExpenseTitle")}
          description={t("deleteExpenseDescription")}
          actions={[
            { label: tCommon("cancel"), type: "cancel", className: "mt-0 flex-1 border-none bg-muted hover:bg-muted/80" },
            { label: tCommon("delete"), pendingLabel: tCommon("deleting"), onClick: handleDeleteExpense, async: true, closeOnSuccess: false, variant: "destructive", className: "flex-1" },
          ]}
        />
        <GenericAlertDialog
          open={deletedOpen}
          aboveOverlays
          onOpenChange={setDeletedOpen}
          title={tToasts("expenseDeleted")}
          description={t("deletedElsewhere")}
          actions={[]}
          footer={
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href={`/group/${groupId}`}>{t("backToGroup")}</Link>
            </Button>
          }
        />
      </div>
      <Spinner
        show={Boolean(attachmentSpinnerMessage)}
        className="z-[100]"
        message={attachmentSpinnerMessage}
      />
      <GenericAlertDialog
        open={Boolean(categoryConflict)}
        aboveOverlays
        onOpenChange={(open) => {
          if (!open) handleUseCurrentCategory();
        }}
        title={tConflict("categoryTitle")}
        description={
          shownCategoryConflict
            ? tConflict("categoryDescription", {
                current: conflictCategoryLabel("current"),
                mine: conflictCategoryLabel("mine"),
              })
            : ""
        }
        actions={
          shownCategoryConflict
            ? [
                {
                  label: tConflict("useCategory", {
                    category: conflictCategoryLabel("current"),
                  }),
                  type: "cancel",
                  onClick: handleUseCurrentCategory,
                },
                {
                  label: tConflict("applyCategory", {
                    category: conflictCategoryLabel("mine"),
                  }),
                  onClick: handleApplyMyCategory,
                },
              ]
            : []
        }
      />
      {changeNotices.sheet}
      <GroupDeletedDialog open={groupDeleted} />
    </div>
  );
}
