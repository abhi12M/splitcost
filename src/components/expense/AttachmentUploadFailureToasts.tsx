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

  useEffect(
    () =>
      onAttachmentUploadFailure(({ groupId, expenseId, attachment }) => {
        toast({
          title: tToasts("couldNotUploadImage"),
          description: tToasts("tryAgainHint"),
          variant: "error",
          action: {
            label: tToasts("retry"),
            callback: () => {
              dismissAttachmentUpload(expenseId);
              startAttachmentUpload(groupId, expenseId, attachment);
            },
          },
        });
      }),
    [tToasts]
  );

  return null;
}
