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

export async function saveExpenseAttachment(
  expenseId: string,
  attachment: ExpenseAttachment | null | undefined
) {
  if (attachment === undefined) return null;

  if (attachment === null) {
    await deleteExpenseAttachment(expenseId);
    return null;
  }

  if (!attachment.file) {
    return attachment;
  }

  const formData = new FormData();
  formData.append("file", attachment.file);

  const res = await fetch(`/api/expenses/${expenseId}/attachment`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error || "Failed to upload attachment");
  }

  const payload = await res.json();
  return mapAttachmentResponse(payload);
}

export async function deleteExpenseAttachment(expenseId: string) {
  const res = await fetch(`/api/expenses/${expenseId}/attachment`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error || "Failed to delete attachment");
  }
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
