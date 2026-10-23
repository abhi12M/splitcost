"use client";

import { useSyncExternalStore } from "react";

import {
  revokeAttachmentObjectUrl,
  saveExpenseAttachment,
  type ExpenseAttachment,
} from "@/lib/expenseAttachments";

export type AttachmentUploadStatus = "uploading" | "error";
export type AttachmentUploadState = {
  status: AttachmentUploadStatus;
  intent: ExpenseAttachment | null;
  error?: string;
};

const states = new Map<string, AttachmentUploadState>();
const listeners = new Set<() => void>();
const completedGroupVersions = new Map<string, number>();

/** What a failed background upload needs for a retry. */
export type AttachmentUploadFailure = {
  groupId: string;
  expenseId: string;
  attachment: ExpenseAttachment | null;
  /** The receipt a removal was for, so a retry removes only that one. */
  expectedName?: string;
  /** Why it failed, when the server said (e.g. EXPENSE_DELETED). */
  code?: string;
};
const failureListeners = new Set<(failure: AttachmentUploadFailure) => void>();

/** Notifies about background uploads that failed, e.g. to offer a retry. */
export function onAttachmentUploadFailure(listener: (failure: AttachmentUploadFailure) => void) {
  failureListeners.add(listener);
  return () => {
    failureListeners.delete(listener);
  };
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function createOwnedPreview(attachment: ExpenseAttachment | null) {
  if (!attachment?.file || typeof URL === "undefined") return attachment;
  return { ...attachment, url: URL.createObjectURL(attachment.file) };
}

/**
 * `expectedName` is for a removal (`attachment` null): the receipt the user
 * removed. A different receipt stored now was put there by someone else and
 * is kept.
 */
export function startAttachmentUpload(
  groupId: string,
  expenseId: string,
  attachment: ExpenseAttachment | null,
  expectedName?: string
) {
  const preview = createOwnedPreview(attachment);
  states.set(expenseId, { status: "uploading", intent: preview });
  emit();

  void (async () => {
    try {
      await saveExpenseAttachment(expenseId, attachment, expectedName);
      completedGroupVersions.set(
        groupId,
        (completedGroupVersions.get(groupId) ?? 0) + 1
      );
      states.delete(expenseId);
      emit();
      revokeAttachmentObjectUrl(preview);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "EXPENSE_DELETED" || code === "ATTACHMENT_CHANGED") {
        // The expense is gone, or the receipt was replaced since the user saw
        // it, so there is nothing to retry or show an error on: drop the
        // pending state and just tell the user.
        states.delete(expenseId);
        emit();
        revokeAttachmentObjectUrl(preview);
      } else {
        states.set(expenseId, {
          status: "error",
          intent: preview,
          error: error instanceof Error ? error.message : "Failed to save attachment",
        });
        emit();
        console.error("background attachment save failed:", error);
      }
      for (const listener of failureListeners) listener({ groupId, expenseId, attachment, expectedName, code });
    }
  })();
}

export function dismissAttachmentUpload(expenseId: string) {
  const state = states.get(expenseId);
  if (!state) return;
  revokeAttachmentObjectUrl(state.intent);
  states.delete(expenseId);
  emit();
}

export function useAttachmentUpload(expenseId: string) {
  return useSyncExternalStore(
    subscribe,
    () => states.get(expenseId) ?? null,
    () => null
  );
}

export function useAttachmentUploadCompletion(groupId: string) {
  return useSyncExternalStore(
    subscribe,
    () => completedGroupVersions.get(groupId) ?? 0,
    () => 0
  );
}
