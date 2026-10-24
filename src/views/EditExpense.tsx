"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ExpenseForm, type ExpenseFormHandle } from "@/components/expense/ExpenseForm";
import { addExpense, isGroupDeleted, updateExpense } from "@/lib/storage";
import { GroupDeletedDialog } from "@/components/group/GroupDeletedDialog";
import { ExpenseNotFound } from "@/components/expense/ExpenseNotFound";
import ExpenseFormMobile, { type ExpenseFormMobileHandle } from "@/components/expense/ExpenseFormMobile";
import { ExpenseFormSkeleton } from "@/components/expense/ExpenseFormSkeleton";
import { Spinner } from "@/components/ui/Spinner";
import { ExpenseAttachment } from "@/lib/expenseAttachments";
import { startAttachmentUpload } from "@/lib/attachmentUploads";
import { useExpense } from "@/lib/groupExpenseData";
import { getGroupViewerMemberId } from "@/lib/groupViewer";
import { useExpenseRealtime, useGroupChanges } from "@/hooks/useGroupRealtime";
import { useGroupChangeNotices } from "@/components/group/GroupChangeNotices";
import { useReceiptChangeNotice } from "@/components/expense/useReceiptChangeNotice";
import { applyGroupChangesToGroup } from "@/lib/realtime/groupChanges";
import { useToast } from "@/hooks/use-toast";
import { GenericAlertDialog } from "@/components/ui/generic-alert-dialog";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import { AttachmentGuardProvider } from "@/components/expense/ExpenseAttachmentControl";
import { OfflineBanner } from "@/components/sync/OfflineBanner";
import { useGroupAccess, useOfflineFailureToast } from "@/hooks/useOffline";

export default function EditExpensePage({ groupId, expenseId }: { groupId: string; expenseId: string }) {
  const router = useRouter();
  const t = useTranslations("expense");
  const tCommon = useTranslations("common");
  const tConflict = useTranslations("editConflict");
  const tToasts = useTranslations("toasts");
  const tReceipt = useTranslations("receiptChanges");
  const { toast } = useToast();
  const { data: expenseData, loading, refresh, applyChange } = useExpense(expenseId);
  const access = useGroupAccess(groupId);
  const showOfflineFailure = useOfflineFailureToast();
  const attachmentGuard = { allowed: access.can.attachment, check: () => access.check("attachment") };
  const group = expenseData?.group;
  const expense = expenseData?.expense;
  // Local override so successful save flows can swap the saved attachment in
  // before we navigate away from the page.
  const [attachmentOverride, setAttachmentOverride] =
    useState<ExpenseAttachment | null | undefined>(undefined);
  const attachment =
    attachmentOverride !== undefined
      ? attachmentOverride
      : expense?.attachment ?? null;
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Whether the form had unsaved changes at the moment the expense was found
  // deleted elsewhere; used only to pick which "deleted" dialog copy/actions
  // to render (checked live via the form refs below, not tracked as a
  // sticky flag, so an edit that's since been undone doesn't still count).
  const [wasDirtyOnDelete, setWasDirtyOnDelete] = useState(false);
  // `source` says whether the conflict surfaced while editing (realtime) or
  // blocked a save; `currentRevision` is the newer server revision, adopted
  // only when the user picks "Keep/Save my changes" (dismissing the dialog
  // leaves the old one, so the next save is checked again).
  const [conflict, setConflict] = useState<{ source: "realtime" | "save"; currentRevision?: number } | null>(null);
  // Keeps the dialog's wording steady while it animates closed.
  const conflictSourceRef = useRef<"realtime" | "save">("realtime");
  if (conflict) conflictSourceRef.current = conflict.source;
  const isSaveConflict = conflictSourceRef.current === "save";
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [revisionOverride, setRevisionOverride] = useState<number | undefined>();
  // The last values sent to the server, re-sent by "Save my changes".
  const lastSubmittedRef = useRef<Parameters<typeof updateExpense>[2] | null>(null);
  // Closes the last "couldn't save" toast once a retry succeeds.
  const saveErrorToastRef = useRef<(() => void) | null>(null);
  const [formKey, setFormKey] = useState(0);
  // The receipt the form was last based on, by name. A removal made in the form
  // applies only to this receipt, so one someone else put there meanwhile is
  // not removed. Captured when the form (re)mounts, since that is when it
  // starts from the receipt in `attachment`.
  const formReceiptRef = useRef<{ key: number; name: string | null } | null>(null);
  if (expense && formReceiptRef.current?.key !== formKey) {
    formReceiptRef.current = { key: formKey, name: attachment?.name ?? null };
  }
  const desktopFormRef = useRef<ExpenseFormHandle>(null);
  const mobileFormRef = useRef<ExpenseFormMobileHandle>(null);
  // Read by handleSubmit to decide whether the next submit should create a
  // fresh expense instead of updating the (now-deleted) one it was opened for.
  const createAsNewRef = useRef(false);

  // Whichever form the viewport is currently showing (desktop and mobile
  // forms mount together; only one is visible via CSS breakpoints) is the
  // one whose live values matter.
  const isFormDirty = () =>
    window.matchMedia("(min-width: 768px)").matches
      ? (desktopFormRef.current?.isDirty() ?? false)
      : (mobileFormRef.current?.isDirty() ?? false);

  // Both forms mount together and only one is visible, so both are updated, but
  // the answer is the visible one's: whether the user's own receipt change
  // (if any) stands.
  const syncFormReceipt = (latest: ExpenseAttachment | null) => {
    const desktop = desktopFormRef.current?.syncReceipt(latest) ?? false;
    const mobile = mobileFormRef.current?.syncReceipt(latest) ?? false;
    return window.matchMedia("(min-width: 768px)").matches ? desktop : mobile;
  };

  // The whole group was deleted: nothing here can be saved, so this replaces
  // the expense-level dialogs.
  const [groupDeleted, setGroupDeleted] = useState(false);
  const showGroupDeleted = () => {
    setGroupDeleted(true);
    setDeletedOpen(false);
    setConflict(null);
  };

  // Deleting a group deletes its expenses too, so a missing expense may mean
  // the group is gone; ask the server before offering "create as new".
  const handleExpenseGone = (wasDirty: boolean) => {
    void isGroupDeleted(groupId).then((gone) => {
      if (gone) {
        showGroupDeleted();
        return;
      }
      setWasDirtyOnDelete(wasDirty);
      setDeletedOpen(true);
    });
  };

  const noticeReceiptChange = useReceiptChangeNotice();

  useExpenseRealtime(expenseId, (event, revision, receipt) => {
    if (event === "DELETE") {
      handleExpenseGone(isFormDirty());
    } else if (receipt) {
      // Only the receipt changed, which never clashes with the fields being
      // edited: no conflict dialog and no refused save.
      if (!isFormDirty()) {
        // Nothing to lose: reload the form with the new receipt.
        void refresh().then(() => setFormKey((key) => key + 1));
        if (receipt !== "added") noticeReceiptChange(receipt);
      } else {
        // Keep the edits, and bring the form's receipt up to date unless the
        // user has changed the receipt in the form themselves.
        void refresh().then((latest) => {
          const next = latest?.expense.attachment ?? null;
          if (syncFormReceipt(next)) {
            if (formReceiptRef.current) formReceiptRef.current.name = next?.name ?? null;
            if (receipt !== "added") noticeReceiptChange(receipt);
          } else {
            noticeReceiptChange(receipt, { keptMine: true });
          }
        });
      }
    } else if (isFormDirty()) {
      setConflict({ source: "realtime", currentRevision: revision });
    } else {
      // The reload no longer remounts the form via the skeleton, and the forms
      // read their values only on mount, so remount them with the new values.
      void refresh().then(() => setFormKey((key) => key + 1));
    }
  });

  // Apply the broadcast diff in place: the forms are not remounted, so the
  // user's edits stay, and new members start out of the split.
  const changeNotices = useGroupChangeNotices();
  useGroupChanges(
    groupId,
    (changes) => {
      applyChange((prev) => ({ ...prev, group: applyGroupChangesToGroup(prev.group, changes) }), changes.revision);
      changeNotices.notify(changes);
    },
    showGroupDeleted
  );

  if (loading) {
    return (
      <ExpenseFormSkeleton />
    );
  }

  if (!group || !expense) {
    return <ExpenseNotFound groupId={groupId} loading={<ExpenseFormSkeleton />} />;
  }

  if (group.id !== groupId) {
    return (
      <ResourceNotFound
        message={tCommon("groupNotFound")}
        actionLabel={tCommon("goHome")}
        actionHref="/"
      />
    );
  }

  const storedViewerId = getGroupViewerMemberId(groupId);
  const editViewerMemberId =
    storedViewerId && group.members.some((m) => m.id === storedViewerId)
      ? storedViewerId
      : null;

  /** `revision` overrides the one sent, for "Save my changes" after a conflict. */
  const handleSubmit = async (
    data: Parameters<typeof updateExpense>[2],
    revision: number | undefined = revisionOverride ?? expense.revision
  ) => {
    // Offline in a synced group: the edits stay in the open form, not saved
    // anywhere, until the user saves again once back online.
    if (!access.check("edit")) {
      createAsNewRef.current = false;
      return;
    }
    if (createAsNewRef.current) {
      createAsNewRef.current = false;
      setIsSubmitting(true);
      try {
        const created = await addExpense(groupId!, data);
        if (created?.id && data.attachment?.file) {
          startAttachmentUpload(groupId, created.id, data.attachment);
        }
        saveErrorToastRef.current?.();
        toast({ message: tToasts("expenseAdded"), variant: "success" });
        router.push(`/group/${groupId}`);
      } catch (error) {
        setIsSubmitting(false);
        if ((error as { code?: string }).code === "GROUP_NOT_FOUND") {
          showGroupDeleted();
          return;
        }
        if (showOfflineFailure(error)) return;
        console.error("add expense failed:", error);
        saveErrorToastRef.current = toast({
          title: tToasts("couldNotAddExpense"),
          description: tToasts((error as { status?: number }).status === 400 ? "checkDetailsHint" : "tryAgainHint"),
          variant: "error",
        }).dismiss;
      }
      return;
    }

    lastSubmittedRef.current = data;
    setIsSubmitting(true);
    try {
      await updateExpense(groupId!, expenseId!, { ...data, revision });

      // Decide whether the attachment actually changed. The form passes:
      //   - the existing attachment (no `file`) when untouched
      //   - a fresh attachment with `file` when the user picked a new image
      //   - null when the user explicitly removed it
      // Only the latter two need server work; the in-flight call runs in
      // the background so the user isn't blocked on the upload round-trip.
      const isNewFile = Boolean(data.attachment?.file);
      // Removing applies to the receipt the form showed, not whatever is stored
      // by the time this runs.
      const removedReceiptName = formReceiptRef.current?.name ?? null;
      const isRemoval = data.attachment === null && removedReceiptName !== null;
      if (isNewFile || isRemoval) {
        startAttachmentUpload(groupId, expenseId!, data.attachment ?? null, isRemoval ? removedReceiptName : undefined);
        // Reflect the user's intent locally for the brief moment before we
        // navigate away. (The view page reads the upload store directly.)
        setAttachmentOverride(data.attachment ?? null);
      }

      // Invalidate so the next mount of view/edit and the dashboard refetch
      // fresh data, but the user-perceived hop back is instant (cached
      // dashboard renders immediately, refetch happens in the background).
      saveErrorToastRef.current?.();
      toast({ message: tToasts("expenseUpdated"), variant: "success" });
      router.push(`/group/${groupId}`);
    } catch (error) {
      const failure = error as { code?: string; status?: number; payload?: { currentRevision?: number } };
      if (failure.code === "EXPENSE_DELETED") {
        // Reaching here means the user clicked Save — proof they have
        // changes worth keeping — so offer to recreate them, unless the
        // whole group went with it.
        handleExpenseGone(true);
      } else if (failure.code === "EXPENSE_VERSION_CONFLICT") {
        setConflict({ source: "save", currentRevision: failure.payload?.currentRevision });
      } else if (showOfflineFailure(error)) {
        // The connection dropped mid-save; the edits stay in the form.
      } else {
        // Anything else: say so and stay on the filled form to try again.
        console.error("save expense failed:", error);
        saveErrorToastRef.current = toast({
          title: tToasts("couldNotSaveExpense"),
          description: tToasts(failure.status === 400 ? "checkDetailsHint" : "tryAgainHint"),
          variant: "error",
        }).dismiss;
      }
      setIsSubmitting(false);
    }
  };

  const handleKeepMine = () => {
    // Deliberately go over the other version. After a blocked save the user
    // already chose to save, so re-send it right away; while editing, adopt
    // the newer revision (when the event carried it) and let them carry on.
    const source = conflict?.source;
    const latestRevision = conflict?.currentRevision;
    if (latestRevision !== undefined) setRevisionOverride(latestRevision);
    setConflict(null);
    if (source === "save" && lastSubmittedRef.current) {
      void handleSubmit(lastSubmittedRef.current, latestRevision);
    }
  };

  const handleUseLatest = () => {
    setConflict(null);
    setRevisionOverride(undefined);
    void refresh().then(() => setFormKey((key) => key + 1));
  };

  // Re-submits whichever form the viewport is currently showing (desktop and
  // mobile forms mount together; only one is visible via CSS breakpoints).
  const handleCreateAsNew = () => {
    createAsNewRef.current = true;
    setDeletedOpen(false);
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    if (isDesktop) desktopFormRef.current?.submit();
    else mobileFormRef.current?.submit();
  };

  return (
    <AttachmentGuardProvider value={attachmentGuard}>
      <div className="hidden md:block">
        <Layout variant="minimal">
          <div className="container py-6 md:py-8 max-w-2xl">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/group/${groupId}`}>
                <ArrowLeft className="w-4 h-4" />
                {t("backToGroup")}
              </Link>
            </Button>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{t("editExpense")}</CardTitle>
                      <CardDescription>{t("editDescription")}</CardDescription>
                    </div>
                  </div>
                  <OfflineBanner groupId={groupId} access={access} className="mt-2" />
                </CardHeader>

                <CardContent>
                  <ExpenseForm
                    ref={desktopFormRef}
                    key={formKey}
                    members={group.members}
                    defaultCurrency={group.currency}
                    viewerMemberId={editViewerMemberId}
                    initialData={{
                      ...expense
                    }}
                    initialAttachment={attachment}
                    onSubmit={handleSubmit}
                    canSubmit={() => access.check("edit")}
                    submitLabel={isSubmitting ? tCommon("saving") : t("saveChanges")}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </Layout>
      </div>
      <div className="block md:hidden">
        <ExpenseFormMobile
          ref={mobileFormRef}
          key={formKey}
          members={group.members}
          defaultCurrency={group.currency}
          viewerMemberId={editViewerMemberId}
          groupId={groupId}
          initialData={{
            ...expense
          }}
          initialAttachment={attachment}
          onSubmit={handleSubmit}
          canSubmit={() => access.check("edit")}
        />
      </div>
      <Spinner show={isSubmitting} message={tCommon("saving")} />
      <GenericAlertDialog
        open={Boolean(conflict)}
        // Realtime can open it while a full-screen layer (Split, Paid by…) is up.
        aboveOverlays
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
        title={isSaveConflict ? tConflict("expenseSaveTitle") : tConflict("expenseRealtimeTitle")}
        description={isSaveConflict ? tConflict("expenseSaveDescription") : tConflict("expenseRealtimeDescription")}
        actions={[
          {
            label: isSaveConflict ? tConflict("loadLatest") : tConflict("useLatest"),
            type: "cancel",
            onClick: handleUseLatest,
          },
          {
            label: isSaveConflict ? tConflict("saveMine") : tConflict("keepMine"),
            onClick: handleKeepMine,
          },
        ]}
      />
      {changeNotices.sheet}
      <GroupDeletedDialog open={groupDeleted} />
      <GenericAlertDialog
        open={deletedOpen}
        aboveOverlays
        onOpenChange={setDeletedOpen}
        title={tToasts("expenseDeleted")}
        description={wasDirtyOnDelete ? t("deletedWhileEditing") : t("deletedElsewhere")}
        // Create-as-new makes a fresh expense from the form's values; the receipt
        // that belonged to the deleted one doesn't come along.
        body={
          wasDirtyOnDelete && formReceiptRef.current?.name ? (
            <p className="text-sm text-muted-foreground">{tReceipt("notCarriedOver")}</p>
          ) : undefined
        }
        actions={[]}
        footer={
          wasDirtyOnDelete ? (
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" className="w-full rounded-xl sm:flex-1" onClick={handleCreateAsNew}>
                {t("createAsNew")}
              </Button>
              <Button asChild className="w-full rounded-xl sm:flex-1">
                <Link href={`/group/${groupId}`}>{t("backToGroup")}</Link>
              </Button>
            </div>
          ) : (
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link href={`/group/${groupId}`}>{t("backToGroup")}</Link>
            </Button>
          )
        }
      />
    </AttachmentGuardProvider>
  );
}
