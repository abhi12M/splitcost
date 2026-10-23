import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { EXPENSE_ATTACHMENT_BUCKET } from "@/lib/expenseAttachments";

type StoredAttachmentFile = {
  name: string;
  created_at?: string;
  updated_at?: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  } | null;
};

export type AttachmentPayload = {
  name: string;
  type: string;
  size: number;
  url: string;
  updatedAt: string;
};

export class MissingExpenseAttachmentError extends Error {
  constructor(public readonly path: string) {
    super(`Expense attachment is missing from storage: ${path}`);
    this.name = "MissingExpenseAttachmentError";
  }
}

export function isMissingExpenseAttachmentError(
  error: unknown
): error is MissingExpenseAttachmentError {
  return error instanceof MissingExpenseAttachmentError;
}

export function inferMimeType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "gif") return "image/gif";
  if (extension === "webp") return "image/webp";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "avif") return "image/avif";

  return "image/jpeg";
}

export function getStoragePathFromValue(value: string | null | undefined) {
  if (!value) return null;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsedUrl = new URL(value);
      const publicMarker = `/object/public/${EXPENSE_ATTACHMENT_BUCKET}/`;
      const signedMarker = `/object/sign/${EXPENSE_ATTACHMENT_BUCKET}/`;
      const marker = parsedUrl.pathname.includes(signedMarker)
        ? signedMarker
        : publicMarker;
      const markerIndex = parsedUrl.pathname.indexOf(marker);

      if (markerIndex === -1) return null;

      return decodeURIComponent(
        parsedUrl.pathname.slice(markerIndex + marker.length)
      );
    } catch {
      return null;
    }
  }

  return value;
}

export function getFolderFromPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments.slice(0, -1).join("/");
}

export function getFileNameFromPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] || "attachment";
}

export async function getExpenseAttachmentPath(expenseId: string) {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select("attachment_data_url")
    .eq("id", expenseId)
    .single();

  if (error) {
    throw error;
  }

  return getStoragePathFromValue(data?.attachment_data_url);
}

/**
 * Removes receipt files from storage. Best effort: nothing points at these
 * files any more, so one that can't be removed is only left unused and must
 * not fail the request that got here.
 */
export async function removeAttachmentFiles(
  values: Array<string | null | undefined>,
  label: string
) {
  const paths = [
    ...new Set(
      values
        .map((value) => getStoragePathFromValue(value))
        .filter((path): path is string => Boolean(path))
    ),
  ];

  for (let start = 0; start < paths.length; start += 100) {
    const { error } = await supabaseAdmin.storage
      .from(EXPENSE_ATTACHMENT_BUCKET)
      .remove(paths.slice(start, start + 100));
    if (error) console.error(`${label} error:`, error);
  }
}

/** The receipt value as stored, and whether the expense still exists at all. */
export async function loadExpenseAttachmentValue(expenseId: string) {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select("attachment_data_url")
    .eq("id", expenseId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return { exists: Boolean(data), value: data?.attachment_data_url ?? null };
}

/**
 * Points the expense at a newly uploaded receipt and returns the receipt it
 * replaced. Throws a "EXPENSE_DELETED" error when the expense is gone.
 */
export async function replaceExpenseAttachment(
  expenseId: string,
  attachmentPath: string
) {
  const { data, error } = await supabaseAdmin.rpc("replace_expense_attachment", {
    p_expense_id: expenseId,
    p_attachment_path: attachmentPath,
  });

  if (error) {
    throw error;
  }

  return { previousPath: getStoragePathFromValue(data?.[0]?.previous_path) };
}

/**
 * Removes the expense's receipt and returns the one it removed. With
 * `expectedValue` (the stored value the caller saw) a receipt that has been
 * replaced since is left alone and an "ATTACHMENT_CHANGED" error is thrown.
 * `exists` is false when the expense is already gone: nothing to remove.
 */
export async function clearExpenseAttachment(
  expenseId: string,
  expectedValue?: string | null
) {
  const { data, error } = await supabaseAdmin.rpc("clear_expense_attachment", {
    p_expense_id: expenseId,
    p_expected_path: expectedValue ?? null,
  });

  if (error) {
    throw error;
  }

  const row = data?.[0];
  return {
    exists: Boolean(row),
    previousPath: getStoragePathFromValue(row?.previous_path),
  };
}

async function getStoredFile(path: string) {
  const folder = getFolderFromPath(path);
  const fileName = getFileNameFromPath(path);
  const { data, error } = await supabaseAdmin.storage
    .from(EXPENSE_ATTACHMENT_BUCKET)
    .list(folder, {
      limit: 10,
      search: fileName,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    if (error.message.toLowerCase().includes("not found")) {
      return null;
    }

    throw error;
  }

  return ((data || []) as StoredAttachmentFile[]).find(
    (file) => file.name === fileName
  ) || null;
}

// Repairs a reference to a file that no longer exists. A quiet fix: it is not a
// change anyone made, so it touches neither the revision nor the update time,
// and it only applies if the expense still holds the same value, so a receipt
// uploaded in the meantime is never cleared.
async function clearMissingExpenseAttachmentPath(
  expenseId: string,
  path: string,
  storedValue: string
) {
  try {
    const { error } = await supabaseAdmin
      .from("expenses")
      .update({ attachment_data_url: null })
      .eq("id", expenseId)
      .eq("attachment_data_url", storedValue);

    if (error) throw error;
  } catch (error) {
    console.error("clearMissingExpenseAttachmentPath error:", {
      expenseId,
      path,
      error,
    });
  }
}

export type ExpenseAttachmentReferenceStatus =
  | { status: "none"; path: null }
  | { status: "available"; path: string }
  | { status: "missing"; path: string }
  | { status: "error"; path: string; error: unknown };

export async function reconcileExpenseAttachmentReference(
  expenseId: string,
  value: string | null | undefined
): Promise<ExpenseAttachmentReferenceStatus> {
  const path = getStoragePathFromValue(value);

  if (!path) {
    return { status: "none", path: null };
  }

  try {
    const file = await getStoredFile(path);

    if (!file) {
      await clearMissingExpenseAttachmentPath(expenseId, path, value ?? path);
      return { status: "missing", path };
    }

    return { status: "available", path };
  } catch (error) {
    console.error("reconcileExpenseAttachmentReference error:", {
      expenseId,
      path,
      error,
    });
    return { status: "error", path, error };
  }
}

export async function buildAttachmentPayload(
  path: string
): Promise<AttachmentPayload> {
  const fileName = getFileNameFromPath(path);

  const file = await getStoredFile(path);

  if (!file) {
    throw new MissingExpenseAttachmentError(path);
  }

  const signed = await supabaseAdmin.storage
    .from(EXPENSE_ATTACHMENT_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (signed.error) {
    throw signed.error;
  }

  return {
    name: fileName,
    type: file?.metadata?.mimetype || inferMimeType(fileName),
    size: file?.metadata?.size || 0,
    url: signed.data.signedUrl,
    updatedAt:
      file?.updated_at || file?.created_at || new Date().toISOString(),
  };
}

// Best-effort variant: returns null if the signed URL cannot be generated.
// Used by the expense GET to avoid failing the whole request when storage
// hiccups but the expense row itself is still readable.
export async function tryBuildAttachmentPayload(
  path: string | null | undefined
): Promise<AttachmentPayload | null> {
  if (!path) return null;
  try {
    return await buildAttachmentPayload(path);
  } catch (error) {
    console.error("tryBuildAttachmentPayload error:", error);
    return null;
  }
}

export type ExpenseAttachmentPayloadResolution = {
  status: ExpenseAttachmentReferenceStatus["status"];
  path: string | null;
  attachment: AttachmentPayload | null;
};

export async function resolveExpenseAttachmentPayload(
  expenseId: string,
  value: string | null | undefined
): Promise<ExpenseAttachmentPayloadResolution> {
  const reference = await reconcileExpenseAttachmentReference(expenseId, value);

  if (reference.status !== "available") {
    return {
      status: reference.status,
      path: reference.path,
      attachment: null,
    };
  }

  try {
    return {
      status: "available",
      path: reference.path,
      attachment: await buildAttachmentPayload(reference.path),
    };
  } catch (error) {
    if (isMissingExpenseAttachmentError(error)) {
      await clearMissingExpenseAttachmentPath(expenseId, error.path, value ?? error.path);
      return {
        status: "missing",
        path: error.path,
        attachment: null,
      };
    }

    console.error("resolveExpenseAttachmentPayload error:", error);
    return {
      status: "error",
      path: reference.path,
      attachment: null,
    };
  }
}
