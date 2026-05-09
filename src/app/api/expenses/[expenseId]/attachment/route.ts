import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  EXPENSE_ATTACHMENT_BUCKET,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/lib/expenseAttachments";

type StoredAttachmentFile = {
  name: string;
  created_at?: string;
  updated_at?: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  } | null;
};

function inferMimeType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "gif") return "image/gif";
  if (extension === "webp") return "image/webp";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "avif") return "image/avif";

  return "image/jpeg";
}

function sanitizeAttachmentFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  const extension = dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : "";

  return `${baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "attachment"}${extension}`;
}

function getAttachmentFolder(timestamp = new Date()) {
  const year = timestamp.getFullYear();
  const monthNumber = String(timestamp.getMonth() + 1).padStart(2, "0");
  const monthName = timestamp.toLocaleString("en-US", { month: "long" });

  return `Expenses/${year}/${monthNumber}_${monthName}`;
}

function getAttachmentPath(
  expenseId: string,
  fileName: string,
  timestamp = new Date()
) {
  return `${getAttachmentFolder(timestamp)}/${expenseId}-${fileName}`;
}

function getStoragePathFromValue(value: string | null | undefined) {
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

function getFolderFromPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments.slice(0, -1).join("/");
}

function getFileNameFromPath(path: string) {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] || "attachment";
}

async function getExpenseAttachmentPath(expenseId: string) {
  const { data, error } = await (supabaseAdmin.from("expenses") as any)
    .select("attachment_data_url")
    .eq("id", expenseId)
    .single();

  if (error) {
    throw error;
  }

  return getStoragePathFromValue(data?.attachment_data_url as string | null);
}

async function setExpenseAttachmentPath(
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

async function buildAttachmentPayload(path: string) {
  const file = await getStoredFile(path);
  const { data, error } = await supabaseAdmin.storage
    .from(EXPENSE_ATTACHMENT_BUCKET)
    .createSignedUrl(path, 60 * 60);

  if (error) {
    throw error;
  }

  const fileName = getFileNameFromPath(path);

  return {
    name: fileName,
    type: file?.metadata?.mimetype || inferMimeType(fileName),
    size: file?.metadata?.size || 0,
    url: data.signedUrl,
    updatedAt:
      file?.updated_at || file?.created_at || new Date().toISOString(),
  };
}

function validateServerAttachment(file: File) {
  if (!file.type.startsWith("image/")) {
    return "Please attach an image file.";
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return "Attachment must be 5 MB or smaller.";
  }

  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;

  if (!expenseId) {
    return NextResponse.json(null, { status: 400 });
  }

  try {
    const path = await getExpenseAttachmentPath(expenseId);

    if (!path) {
      return NextResponse.json(null);
    }

    return NextResponse.json(await buildAttachmentPayload(path));
  } catch (error) {
    console.error("loadExpenseAttachment error:", error);
    return NextResponse.json(
      { error: "Failed to load attachment" },
      { status: 400 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;

  if (!expenseId) {
    return NextResponse.json(
      { error: "Missing expenseId" },
      { status: 400 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Attachment file is required" },
        { status: 400 }
      );
    }

    const validationError = validateServerAttachment(file);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    const existingPath = await getExpenseAttachmentPath(expenseId);
    if (existingPath) {
      await supabaseAdmin.storage
        .from(EXPENSE_ATTACHMENT_BUCKET)
        .remove([existingPath]);
    }

    const fileName = `${Date.now()}-${sanitizeAttachmentFileName(file.name)}`;
    const path = getAttachmentPath(expenseId, fileName);
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from(EXPENSE_ATTACHMENT_BUCKET)
      .upload(path, fileBuffer, {
        upsert: false,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (error) {
      throw error;
    }

    await setExpenseAttachmentPath(expenseId, path);

    return NextResponse.json(await buildAttachmentPayload(path));
  } catch (error) {
    console.error("saveExpenseAttachment error:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;

  if (!expenseId) {
    return NextResponse.json(
      { error: "Missing expenseId" },
      { status: 400 }
    );
  }

  try {
    const existingPath = await getExpenseAttachmentPath(expenseId);

    if (existingPath) {
      const { error } = await supabaseAdmin.storage
        .from(EXPENSE_ATTACHMENT_BUCKET)
        .remove([existingPath]);

      if (error) {
        throw error;
      }
    }

    await setExpenseAttachmentPath(expenseId, null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("deleteExpenseAttachment error:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 400 }
    );
  }
}
