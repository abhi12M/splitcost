import { getRealtimeOriginSessionId } from "@/lib/realtime/originSession";
// A dropped connection then fails with an OfflineError (code "OFFLINE"), which
// callers can tell apart from the server refusing the receipt.
import { trackedFetch } from "@/lib/offline/network";
import { patchCachedExpenseReceipt } from "@/lib/offline/cache";

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENT_SIZE_LABEL = "5 MB";
export const EXPENSE_ATTACHMENT_BUCKET = "expense-attachments";

export type ExpenseAttachment = {
  name: string;
  type: string;
  size: number;
  url: string;
  updatedAt: string;
  file?: File | null;
};

type ExpenseAttachmentApiResponse = {
  name: string;
  type: string;
  size: number;
  url: string;
  updatedAt: string;
};

function mapAttachmentResponse(
  attachment: ExpenseAttachmentApiResponse | null
): ExpenseAttachment | null {
  if (!attachment) return null;

  return {
    name: attachment.name,
    type: attachment.type,
    size: attachment.size,
    url: attachment.url,
    updatedAt: attachment.updatedAt,
  };
}

/** `code` says why a receipt call failed, e.g. EXPENSE_DELETED or ATTACHMENT_CHANGED. */
export type ExpenseAttachmentError = Error & { code?: string };

function attachmentError(payload: { error?: string; code?: string } | null, fallback: string) {
  const error = new Error(payload?.error || payload?.code || fallback) as ExpenseAttachmentError;
  error.code = payload?.code;
  return error;
}

export function validateAttachmentFile(file: File): string | null {
  if (!file.type.startsWith("image/")) {
    return "Please attach an image file.";
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `Attachment must be ${MAX_ATTACHMENT_SIZE_LABEL} or smaller.`;
  }

  return null;
}

export async function readExpenseAttachmentFile(
  file: File
): Promise<ExpenseAttachment> {
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    url: URL.createObjectURL(file),
    updatedAt: new Date().toISOString(),
    file,
  };
}

// Revoke the in-memory blob URL backing a locally-read attachment so the
// browser can release the underlying file. Safe to call with any attachment;
// only blob: URLs are touched.
export function revokeAttachmentObjectUrl(
  attachment: ExpenseAttachment | null | undefined
) {
  if (
    typeof URL === "undefined" ||
    !attachment ||
    !attachment.url?.startsWith("blob:")
  ) {
    return;
  }

  try {
    URL.revokeObjectURL(attachment.url);
  } catch {
    // Best-effort cleanup — ignore browser quirks.
  }
}

/**
 * `expectedName` applies to a removal (`attachment` null): the receipt the user
 * removed. If someone replaced it meanwhile, the newer one is left alone and
 * the error's code is ATTACHMENT_CHANGED.
 */
export async function saveExpenseAttachment(
  expenseId: string,
  attachment: ExpenseAttachment | null | undefined,
  expectedName?: string
) {
  if (attachment === undefined) return null;

  if (attachment === null) {
    await deleteExpenseAttachment(expenseId, expectedName);
    return null;
  }

  if (!attachment.file) {
    return attachment;
  }

  const formData = new FormData();
  formData.append("file", attachment.file);
  formData.append("originSessionId", getRealtimeOriginSessionId());

  const res = await trackedFetch(`/api/expenses/${expenseId}/attachment`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw attachmentError(payload, "Failed to upload attachment");
  }

  const payload = await res.json();
  // Mark it in the saved copies so the dashboard's receipt marker is right at once.
  await patchCachedExpenseReceipt(expenseId, true);
  return mapAttachmentResponse(payload);
}

/**
 * `expectedName` is the receipt the user saw. When someone has replaced it
 * since, nothing is deleted and the error's code is ATTACHMENT_CHANGED. Leave
 * it out to delete whatever receipt is there.
 */
export async function deleteExpenseAttachment(expenseId: string, expectedName?: string) {
  const res = await trackedFetch(`/api/expenses/${expenseId}/attachment`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      originSessionId: getRealtimeOriginSessionId(),
      ...(expectedName ? { expectedName } : {}),
    }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw attachmentError(payload, "Failed to delete attachment");
  }
  await patchCachedExpenseReceipt(expenseId, false);
}

export function formatAttachmentSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size <= 0) {
    return "";
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`;
}
