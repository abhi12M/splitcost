import { ChangeEvent, useRef, useState } from "react";
import { ImagePlus, Loader2, Pencil, Trash2, X } from "lucide-react";

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
import {
  ExpenseAttachment,
  formatAttachmentSize,
  MAX_ATTACHMENT_SIZE_LABEL,
  readExpenseAttachmentFile,
  validateAttachmentFile,
} from "@/lib/expenseAttachments";
import { cn } from "@/lib/utils";
import { ExpenseAttachmentViewer } from "./ExpenseAttachmentViewer";

type ExpenseAttachmentControlProps = {
  attachment: ExpenseAttachment | null;
  onChange: (attachment: ExpenseAttachment | null) => void;
  compact?: boolean;
};

export function ExpenseAttachmentControl({
  attachment,
  onChange,
  compact = false,
}: ExpenseAttachmentControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const clearAttachment = () => {
    setError("");
    setIsViewerOpen(false);
    setIsDeleteConfirmOpen(false);
    onChange(null);
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
      onChange(nextAttachment);
      setIsViewerOpen(true);
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
        onClick={() => inputRef.current?.click()}
        aria-label="Replace attachment"
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
        onClick={() => setIsDeleteConfirmOpen(true)}
        aria-label="Remove attachment"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-foreground/70 transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-foreground active:bg-transparent focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 sm:hover:bg-muted"
        disabled={isReadingFile}
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </>
  );

  return (
    <div className={cn("min-w-0", compact ? "shrink-0" : "w-full")}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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
              inputRef.current?.click();
            }
          }}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70",
            attachment
              ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              : "border-transparent bg-transparent text-muted-foreground hover:text-primary"
          )}
          aria-label={attachment ? "Open attachment" : "Add attachment"}
          title={attachment ? "Open attachment" : "Add attachment"}
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
            aria-label="Open attachment"
            disabled={isReadingFile}
            title="Open attachment"
          >
            {attachmentIcon}
          </button>
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => setIsViewerOpen(true)}
            title="Open attachment"
            disabled={isReadingFile}
          >
            <span className="block truncate text-xs font-medium">
              {attachment.name}
            </span>
            {!compact && (
              <span className="block text-[11px] text-muted-foreground">
                {formatAttachmentSize(attachment.size) || "Attached file"}
              </span>
            )}
          </button>
          <button
            type="button"
            className="rounded-full p-1 text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={() => setIsDeleteConfirmOpen(true)}
            aria-label="Remove attachment"
            disabled={isReadingFile}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex items-center gap-2 rounded-full border border-dashed px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/60 hover:text-primary",
            !compact && "w-full justify-center rounded-lg py-3"
          )}
          disabled={isReadingFile}
        >
          {attachmentIcon}
          <span>{compact ? "Add image" : `Attach image (max ${MAX_ATTACHMENT_SIZE_LABEL})`}</span>
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

      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <AlertDialogContent className="max-w-[290px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Delete image?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will remove the attached image from this expense.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex-row gap-2">
            <AlertDialogCancel className="mt-0 flex-1 rounded-xl border-none bg-muted hover:bg-muted/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAttachment}
              disabled={isReadingFile}
              className="flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
