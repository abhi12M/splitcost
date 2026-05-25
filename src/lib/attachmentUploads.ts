"use client";

// Background-upload tracking for expense attachments.
//
// The forms (Add / Edit) save an expense and then need to push the attachment
// to Supabase Storage. The upload itself is by far the slowest part of the
// save flow (multipart upload + signed-URL round-trip), so awaiting it
// blocks the user on the form for hundreds of milliseconds.
//
// This module decouples the two: the form kicks off the upload through
// `startAttachmentUpload` and immediately navigates away. We track the
// in-flight upload in a module-level Map keyed by expenseId, expose a
// `useAttachmentUpload(expenseId)` hook backed by `useSyncExternalStore`,
// and patch the React Query cache once the upload settles.
//
// The view page reads the pending state and renders a spinner over the
// local blob preview while the actual upload is still running.

import { useSyncExternalStore } from "react";
import type { QueryClient } from "@tanstack/react-query";

import {
  revokeAttachmentObjectUrl,
  saveExpenseAttachment,
  type ExpenseAttachment,
} from "@/lib/expenseAttachments";
import { clearCachedExpense } from "@/lib/expenseCache";
import {
  invalidateGroupDashboard,
  patchExpenseAttachmentInDashboard,
  queryKeys,
} from "@/lib/queries";
import type { EditExpenseInterface } from "@/lib/storage";

export type AttachmentUploadStatus = "uploading" | "error";

export type AttachmentUploadState = {
  status: AttachmentUploadStatus;
  // The user's intended next attachment value. `null` means delete.
  intent: ExpenseAttachment | null;
  // Local preview to render in the placeholder while the request is in
  // flight. For new uploads this is the same object as `intent` (it carries
  // the `blob:` URL backed by the picked File). For deletes this is `null`.
  preview: ExpenseAttachment | null;
  error?: string;
};

const states = new Map<string, AttachmentUploadState>();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commitToQuery(
  queryClient: QueryClient,
  expenseId: string,
  next: ExpenseAttachment | null
) {
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

  const groupId = queryClient.getQueryData<EditExpenseInterface | null>(
    queryKeys.expense(expenseId)
  )?.group?.id;

  if (groupId) {
    patchExpenseAttachmentInDashboard(
      queryClient,
      groupId,
      expenseId,
      Boolean(next)
    );
    void invalidateGroupDashboard(queryClient, groupId);
  }

  // Drop the sessionStorage entry — the next read will pull fresh from the
  // server (which is now consistent with our React Query cache update).
  clearCachedExpense(expenseId);
}

// Build a preview attachment whose blob URL is owned by this module. The
// form (`ExpenseAttachmentControl`) revokes its own blob URL when it
// unmounts, so we cannot reuse that URL for the background preview — by
// the time the upload completes the URL would be dead. Instead we mint a
// fresh URL from the underlying File and revoke ours when the upload
// settles.
function createOwnedPreview(
  attachment: ExpenseAttachment | null
): ExpenseAttachment | null {
  if (!attachment) return null;
  if (!attachment.file) return attachment;
  if (typeof URL === "undefined") return attachment;
  return {
    ...attachment,
    url: URL.createObjectURL(attachment.file),
  };
}

// Kick off an attachment save in the background. Safe to fire and forget;
// the view subscribes to the store via `useAttachmentUpload`.
export function startAttachmentUpload(
  queryClient: QueryClient,
  expenseId: string,
  attachment: ExpenseAttachment | null
) {
  const preview = createOwnedPreview(attachment);

  states.set(expenseId, {
    status: "uploading",
    intent: preview,
    preview,
  });
  emit();

  void (async () => {
    try {
      const saved = await saveExpenseAttachment(expenseId, attachment);
      // Replace the optimistic blob URL with the server's signed URL on
      // success. After this point the view falls back to the React Query
      // cache (no more preview override).
      commitToQuery(queryClient, expenseId, saved);
      states.delete(expenseId);
      emit();
      revokeAttachmentObjectUrl(preview);
    } catch (error) {
      // Keep the entry as `error` so the view can render an indicator.
      // The blob URL is preserved so the failed preview stays visible
      // until the user dismisses (or we navigate away from the tab).
      states.set(expenseId, {
        status: "error",
        intent: preview,
        preview,
        error:
          error instanceof Error ? error.message : "Failed to save attachment",
      });
      emit();
      console.error("background attachment save failed:", error);
    }
  })();
}

// Manually clear a pending entry. Used when the user dismisses an error or
// otherwise wants to forget about a failed upload.
export function dismissAttachmentUpload(expenseId: string) {
  const state = states.get(expenseId);
  if (!state) return;
  revokeAttachmentObjectUrl(state.preview);
  states.delete(expenseId);
  emit();
}

function getSnapshot(expenseId: string) {
  return states.get(expenseId) ?? null;
}

function getServerSnapshot(): AttachmentUploadState | null {
  return null;
}

export function useAttachmentUpload(
  expenseId: string
): AttachmentUploadState | null {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(expenseId),
    getServerSnapshot
  );
}
