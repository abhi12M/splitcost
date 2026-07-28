import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";
import { EXPENSE_ATTACHMENT_BUCKET } from "@/lib/expenseAttachments";
import { buildStoragePath } from "@/lib/supabase/storagePaths";

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

export function buildExpenseAttachmentPath(
  expenseId: string,
  fileName: string,
  timestamp = new Date()
) {
  return buildStoragePath({
    rootFolder: "Expenses",
    entityPrefix: "EXP",
    entityId: expenseId,
    fileName,
    timestamp,
  });
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
  const { data, error } = await (supabaseAdmin.from("expenses") as any)
    .select("attachment_data_url")
    .eq("id", expenseId)
    .single();

  if (error) {
    throw error;
  }

  return getStoragePathFromValue(data?.attachment_data_url as string | null);
}

export async function setExpenseAttachmentPath(
  expenseId: string,
  attachmentPath: string | null
) {
  const { error } = await (supabaseAdmin.from("expenses") as any)
    .update({
      attachment_data_url: attachmentPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", expenseId);

  if (error) {
    throw error;
  }
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

// Parallelize the metadata list and signed-URL generation. They are independent
// calls, and previously they ran sequentially (~100 ms wasted per request).
export async function buildAttachmentPayload(
  path: string
): Promise<AttachmentPayload> {
  const fileName = getFileNameFromPath(path);

  const [file, signed] = await Promise.all([
    getStoredFile(path),
    supabaseAdmin.storage
      .from(EXPENSE_ATTACHMENT_BUCKET)
      .createSignedUrl(path, 60 * 60),
  ]);

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
