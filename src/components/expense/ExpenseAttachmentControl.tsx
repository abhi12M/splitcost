"use client";

import { ChangeEvent, createContext, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, Images, ImagePlus, Loader2, Pencil, Trash2, X } from "lucide-react";

import { GenericAlertDialog } from "@/components/ui/generic-alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  ExpenseAttachment,
  formatAttachmentSize,
  MAX_ATTACHMENT_SIZE_LABEL,
  readExpenseAttachmentFile,
  validateAttachmentFile,
} from "@/lib/expenseAttachments";
import { cn } from "@/lib/utils";
import { useBackButtonClose } from "@/hooks/useBackButtonClose";
import { ExpenseAttachmentViewer } from "./ExpenseAttachmentViewer";

type ExpenseAttachmentControlProps = {
  attachment: ExpenseAttachment | null;
  onChange: (attachment: ExpenseAttachment | null) => void;
  compact?: boolean;
};

type AttachmentGuard = {
  /** False while receipts can't be changed (offline, or a group not synced yet). */
  allowed: boolean;
  /** Returns whether changing the receipt is allowed, explaining why not otherwise. */
  check: () => boolean;
};

const AttachmentGuardContext = createContext<AttachmentGuard | null>(null);

/** Lets the screen hosting an expense form say when receipts can't be changed. */
export const AttachmentGuardProvider = AttachmentGuardContext.Provider;

export function ExpenseAttachmentControl({
  attachment,
  onChange,
  compact = false,
}: ExpenseAttachmentControlProps) {
  const t = useTranslations("expense");
  const tCommon = useTranslations("common");
  const guard = useContext(AttachmentGuardContext);
  const blocked = guard ? !guard.allowed : false;
  const allowChange = () => (guard ? guard.check() : true);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useBackButtonClose(isSourcePickerOpen, () => setIsSourcePickerOpen(false));

  // Track the blob URL we created locally so we can revoke it when the user
  // replaces it, removes it, or unmounts the form. Without this the File
  // reference behind the blob URL stays alive for the page's lifetime.
  const ownedBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (ownedBlobUrlRef.current) {
        try {
          URL.revokeObjectURL(ownedBlobUrlRef.current);
        } catch {
          // Best-effort cleanup.
        }
        ownedBlobUrlRef.current = null;
      }
    };
  }, []);

  const releaseOwnedBlobUrl = () => {
    if (ownedBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(ownedBlobUrlRef.current);
      } catch {
        // Best-effort cleanup.
      }
      ownedBlobUrlRef.current = null;
    }
  };

  const clearAttachment = () => {
    setError("");
    setIsViewerOpen(false);
    setIsDeleteConfirmOpen(false);
    releaseOwnedBlobUrl();
    onChange(null);
  };

  const openSourcePicker = () => {
    if (!allowChange()) return;
    setError("");
    setIsSourcePickerOpen(true);
  };

  const openDeleteConfirm = () => {
    if (allowChange()) setIsDeleteConfirmOpen(true);
  };

  const chooseSource = (input: HTMLInputElement | null) => {
    input?.click();
    setIsSourcePickerOpen(false);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateAttachmentFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsReadingFile(true);
    try {
      const nextAttachment = await readExpenseAttachmentFile(file);
      // Replacing an existing local file? Revoke the previous blob URL first.
      releaseOwnedBlobUrl();
      ownedBlobUrlRef.current = nextAttachment.url.startsWith("blob:")
        ? nextAttachment.url
        : null;
      onChange(nextAttachment);
      setIsViewerOpen(false);
    } finally {
      setIsReadingFile(false);
    }
  };

  const AttachmentIcon = ImagePlus;
  const attachmentIcon = isReadingFile ? (
    <Loader2 className={cn("animate-spin", compact ? "h-5 w-5" : "h-4 w-4")} />
  ) : (
    <AttachmentIcon className={cn(compact ? "h-5 w-5" : "h-4 w-4")} />
  );
  const viewerActions = (
    <>
      <button
        type="button"
        onClick={openSourcePicker}
        aria-label={t("replaceAttachment")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground/70 transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-foreground active:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:hover:bg-muted"
        disabled={isReadingFile}
      >
        {isReadingFile ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Pencil className="h-5 w-5" />
        )}
      </button>
      <button
        type="button"
        onClick={openDeleteConfirm}
        aria-label={t("removeAttachment")}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground/70 transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-foreground active:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:hover:bg-muted"
        disabled={isReadingFile}
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </>
  );

  return (
    <div
      className={cn("min-w-0", compact ? "shrink-0" : "w-full", blocked && "opacity-50")}
      aria-disabled={blocked || undefined}
    >
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {compact ? (
        <button
          type="button"
          onClick={() => {
            if (attachment) {
              setIsViewerOpen(true);
            } else {
              openSourcePicker();
            }
          }}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent bg-transparent transition-colors [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70",
            attachment
              ? "text-primary"
              : "text-muted-foreground sm:hover:text-primary"
          )}
          aria-label={attachment ? t("openAttachment") : t("addAttachment")}
          aria-pressed={Boolean(attachment)}
          title={attachment ? t("openAttachment") : t("addAttachment")}
          disabled={isReadingFile}
        >
          {attachmentIcon}
        </button>
      ) : attachment ? (
        <div
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-full border bg-muted/50 px-2.5 py-1.5",
            !compact && "rounded-lg px-3 py-2"
          )}
        >
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-70"
            onClick={() => setIsViewerOpen(true)}
            aria-label={t("openAttachment")}
            disabled={isReadingFile}
            title={t("openAttachment")}
          >
            {attachmentIcon}
          </button>
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => setIsViewerOpen(true)}
            title={t("openAttachment")}
            disabled={isReadingFile}
          >
            <span className="block truncate text-xs font-medium">
              {attachment.name}
            </span>
            {!compact && (
              <span className="block text-[11px] text-muted-foreground">
                {formatAttachmentSize(attachment.size) || t("attachedFile")}
              </span>
            )}
          </button>
          <button
            type="button"
            className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={openDeleteConfirm}
            aria-label={t("removeAttachment")}
            disabled={isReadingFile}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openSourcePicker}
          className={cn(
            "flex items-center gap-2 rounded-full border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/60 hover:text-primary",
            !compact && "w-full justify-center rounded-lg py-3"
          )}
          disabled={isReadingFile}
        >
          {attachmentIcon}
          <span>{compact ? t("addImage") : t("attachImage", { max: MAX_ATTACHMENT_SIZE_LABEL })}</span>
        </button>
      )}

      {error && (
        <p className={cn("mt-1 text-[11px] text-destructive", compact && "absolute")}>
          {error}
        </p>
      )}

      <ExpenseAttachmentViewer
        attachment={attachment}
        open={isViewerOpen && Boolean(attachment)}
        onOpenChange={setIsViewerOpen}
        actions={viewerActions}
      />

      <Drawer open={isSourcePickerOpen} onOpenChange={setIsSourcePickerOpen}>
        <DrawerContent className="rounded-t-3xl border-x-0 border-b-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl [&>div:first-child]:hidden">
          <div className="mx-auto w-full max-w-md">
            <DrawerTitle className="sr-only">{t("imageSourceTitle")}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {t("imageSourceDescription")}
            </DrawerDescription>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => chooseSource(cameraInputRef.current)}
                className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-primary px-3 text-primary-foreground shadow-sm transition-transform active:scale-[0.97]"
              >
                <Camera className="h-5 w-5" />
                <span className="text-sm font-semibold">{t("takePhoto")}</span>
              </button>
              <button
                type="button"
                onClick={() => chooseSource(galleryInputRef.current)}
                className="flex h-14 items-center justify-center gap-2.5 rounded-2xl border bg-muted/60 px-3 text-foreground transition-transform hover:bg-muted active:scale-[0.97]"
              >
                <Images className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">{t("chooseFromGallery")}</span>
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <GenericAlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        title={t("deleteImageTitle")}
        description={t("deleteImageDescription")}
        actions={[
          { label: tCommon("cancel"), type: "cancel", className: "mt-0 flex-1 border-none bg-muted hover:bg-muted/80" },
          { label: tCommon("delete"), onClick: clearAttachment, disabled: isReadingFile, className: "flex-1 bg-destructive text-white hover:bg-destructive/90" },
        ]}
      />
    </div>
  );
}
