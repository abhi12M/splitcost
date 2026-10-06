import { recordExpenseChanges } from "@/lib/activity/server/recordExpenseActivity";
import { loadExpenseSnapshot } from "@/lib/activity/server/expenseSnapshots";
import { readFormData } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  EXPENSE_ATTACHMENT_BUCKET,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/lib/expenseAttachments";
import {
  buildAttachmentPayload,
  getExpenseAttachmentPath,
  reconcileExpenseAttachmentReference,
  resolveExpenseAttachmentPayload,
  setExpenseAttachmentPath,
} from "@/lib/supabase/attachments";
import { buildExpenseAttachmentPath } from "@/lib/supabase/storagePaths";

function validateServerAttachment(file: File) {
  if (!file.type.startsWith("image/")) {
    return "Please attach an image file.";
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return "Attachment must be 5 MB or smaller.";
  }

  return null;
}

async function recordAttachmentChange(
  expenseId: string,
  action: "added" | "replaced" | "removed",
  originSessionId: string | null
) {
  const expense = await loadExpenseSnapshot(expenseId);
  if (expense) await recordExpenseChanges(expense, [{ field: "attachment", action }], originSessionId);
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
    const resolution = await resolveExpenseAttachmentPayload(expenseId, path);

    return NextResponse.json(resolution.attachment);
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

  const form = await readFormData(req);
  if (!form.ok) return form.response;

  try {
    const formData = form.data;
    const file = formData.get("file");
    const originSessionIdField = formData.get("originSessionId");
    const originSessionId =
      typeof originSessionIdField === "string" ? originSessionIdField.slice(0, 128) : null;

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
    const path = buildExpenseAttachmentPath(expenseId);
    const fileBuffer = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    const { error } = await supabaseAdmin.storage
      .from(EXPENSE_ATTACHMENT_BUCKET)
      .upload(path, fileBuffer, {
        upsert: false,
        contentType: "image/jpeg",
        cacheControl: "3600",
      });

    if (error) {
      throw error;
    }

    try {
      await setExpenseAttachmentPath(expenseId, path, originSessionId);
    } catch (error) {
      await supabaseAdmin.storage
        .from(EXPENSE_ATTACHMENT_BUCKET)
        .remove([path]);
      throw error;
    }

    if (existingPath) {
      const { error: removeError } = await supabaseAdmin.storage
        .from(EXPENSE_ATTACHMENT_BUCKET)
        .remove([existingPath]);

      if (removeError) {
        console.error("removePreviousExpenseAttachment error:", removeError);
      }
    }

    await recordAttachmentChange(expenseId, existingPath ? "replaced" : "added", originSessionId);
    return successJson(await buildAttachmentPayload(path), SUCCESS_MESSAGES.receiptUploaded);
  } catch (error) {
    console.error("saveExpenseAttachment error:", error);
    return NextResponse.json(
      { error: "Failed to upload attachment" },
      { status: 400 }
    );
  }
}

export async function DELETE(
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
    const body = await req.json().catch(() => ({}));
    const originSessionId =
      typeof body?.originSessionId === "string" ? body.originSessionId.slice(0, 128) : null;

    const existingPath = await getExpenseAttachmentPath(expenseId);

    if (existingPath) {
      const reference = await reconcileExpenseAttachmentReference(
        expenseId,
        existingPath
      );

      if (reference.status === "available" || reference.status === "error") {
        const { error } = await supabaseAdmin.storage
          .from(EXPENSE_ATTACHMENT_BUCKET)
          .remove([existingPath]);

        if (error) {
          throw error;
        }
      }
    }

    await setExpenseAttachmentPath(expenseId, null, originSessionId);

    if (existingPath) await recordAttachmentChange(expenseId, "removed", originSessionId);
    return successJson({ success: true }, SUCCESS_MESSAGES.receiptRemoved);
  } catch (error) {
    console.error("deleteExpenseAttachment error:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 400 }
    );
  }
}
