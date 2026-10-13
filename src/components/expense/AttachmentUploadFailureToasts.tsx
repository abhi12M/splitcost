"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { toast } from "@/hooks/use-toast";
import { dismissAttachmentUpload, onAttachmentUploadFailure, startAttachmentUpload } from "@/lib/attachmentUploads";

/**
 * A saved expense's image uploads in the background, usually after the user
 * has left the form. Surface failures app-wide with a Retry that re-sends the
 * same image, so it isn't silently lost.
 */
export function AttachmentUploadFailureToasts() {
  const tToasts = useTranslations("toasts");
  const tReceipt = useTranslations("receiptChanges");

  useEffect(
    () =>
      onAttachmentUploadFailure(({ groupId, expenseId, attachment, expectedName, code }) => {
        // Retrying can't help: the expense it belonged to no longer exists.
        if (code === "EXPENSE_DELETED") {
          toast({
            title: tReceipt("notSavedTitle"),
            description: tReceipt("notSavedDescription"),
            variant: "info",
          });
          return;
        }
        // Someone replaced the receipt the user removed: theirs is kept.
        if (code === "ATTACHMENT_CHANGED") {
          toast({
            title: tReceipt("keptTitle"),
            description: tReceipt("keptDescription"),
            variant: "info",
          });
          return;
        }
        toast({
          title: tToasts("couldNotUploadImage"),
          description: tToasts("tryAgainHint"),
          variant: "error",
          action: {
            label: tToasts("retry"),
            callback: () => {
              dismissAttachmentUpload(expenseId);
              startAttachmentUpload(groupId, expenseId, attachment, expectedName);
            },
          },
        });
      }),
    [tToasts, tReceipt]
  );

  return null;
}
