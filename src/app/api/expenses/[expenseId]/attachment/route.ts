import { recordExpenseChanges } from "@/lib/activity/server/recordExpenseActivity";
import { loadExpenseSnapshot } from "@/lib/activity/server/expenseSnapshots";
import { broadcastExpenseChange } from "@/lib/api/broadcastExpense";
import { isValidUUID } from "@/lib/api/expenseValidation";
import { readFormData, readJsonObject } from "@/lib/api/request";
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
  clearExpenseAttachment,
  getExpenseAttachmentPath,
  getFileNameFromPath,
  getStoragePathFromValue,
  isMissingExpenseAttachmentError,
  loadExpenseAttachmentValue,
  removeAttachmentFiles,
  replaceExpenseAttachment,
  resolveExpenseAttachmentPayload,
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
  if (expense) {
    await recordExpenseChanges(expense, [{ field: "attachment", action }], originSessionId);
    // `receipt` tells open screens that only the receipt changed, so they
    // don't treat it as an edit of the expense's other fields.
    broadcastExpenseChange({
      event: "UPDATE",
      expenseId,
      groupId: expense.groupId,
      originSessionId,
      receipt: action,
    });
  }
}

const errorMessage = (error: unknown) => (error as { message?: string } | null)?.message;

const expenseDeletedResponse = (expenseId: string) =>
  NextResponse.json({ code: "EXPENSE_DELETED", expenseId }, { status: 404 });

const removeStoredFile = (path: string | null, label: string) => removeAttachmentFiles([path], label);

export async function GET(
  _req: Request,
  { params }: { params: { expenseId: string } }
) {
  const expenseId = params.expenseId;

  if (!isValidUUID(expenseId)) {
    return NextResponse.json({ error: "Invalid expense ID" }, { status: 400 });
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

  if (!isValidUUID(expenseId)) {
    return NextResponse.json(
      { error: "Invalid expense ID" },
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

    // Don't process and upload an image for an expense that is already gone.
    if (!(await loadExpenseAttachmentValue(expenseId)).exists) {
      return expenseDeletedResponse(expenseId);
    }

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

    // The swap reports the receipt it actually replaced, even when someone else
    // uploaded one a moment ago, so each upload removes exactly one old file.
    let previousPath: string | null;
    try {
      ({ previousPath } = await replaceExpenseAttachment(expenseId, path));
    } catch (error) {
      await removeStoredFile(path, "removeUnattachedExpenseAttachment");
      // Deleted while the image was uploading: nothing to attach it to.
      if (errorMessage(error) === "EXPENSE_DELETED") return expenseDeletedResponse(expenseId);
      throw error;
    }

    await removeStoredFile(previousPath, "removePreviousExpenseAttachment");
    await recordAttachmentChange(expenseId, previousPath ? "replaced" : "added", originSessionId);

    let payload;
    try {
      payload = await buildAttachmentPayload(path);
    } catch (error) {
      if (!isMissingExpenseAttachmentError(error)) throw error;
      // Someone else replaced this receipt in the instant since it was saved,
      // which removed the file. The upload did succeed; answer with the receipt
      // that is there now, so this person sees the latest one.
      const latest = await resolveExpenseAttachmentPayload(
        expenseId,
        (await loadExpenseAttachmentValue(expenseId)).value
      );
      if (!latest.attachment) throw error;
      payload = latest.attachment;
    }
    return successJson(payload, SUCCESS_MESSAGES.receiptUploaded);
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

  if (!isValidUUID(expenseId)) {
    return NextResponse.json(
      { error: "Invalid expense ID" },
      { status: 400 }
    );
  }

  try {
    const delParsed = await readJsonObject(req, { allowedKeys: ["originSessionId", "expectedName"] });
    const originSessionId =
      delParsed.ok && typeof delParsed.data.originSessionId === "string"
        ? delParsed.data.originSessionId.slice(0, 128)
        : null;
    // The receipt the user saw. Without it the delete is unconditional, which is
    // what "Delete anyway" and the edit form's remove rely on.
    const expectedName =
      delParsed.ok && typeof delParsed.data.expectedName === "string" && delParsed.data.expectedName
        ? delParsed.data.expectedName.slice(0, 256)
        : null;

    const current = await loadExpenseAttachmentValue(expenseId);
    let expectedValue: string | null = null;
    if (current.value && expectedName) {
      const currentName = getFileNameFromPath(getStoragePathFromValue(current.value) ?? current.value);
      if (currentName !== expectedName) {
        return NextResponse.json({ code: "ATTACHMENT_CHANGED", expenseId }, { status: 409 });
      }
      // Also checked inside the delete itself, in case it changes right now.
      expectedValue = current.value;
    }

    // An expense that is already gone, or a receipt that is already removed,
    // means there is nothing left to do: the caller wanted it gone and it is.
    const { previousPath } = await clearExpenseAttachment(expenseId, expectedValue);

    await removeStoredFile(previousPath, "removeExpenseAttachmentFile");
    if (previousPath) await recordAttachmentChange(expenseId, "removed", originSessionId);
    return successJson({ success: true }, SUCCESS_MESSAGES.receiptRemoved);
  } catch (error) {
    if (errorMessage(error) === "ATTACHMENT_CHANGED") {
      return NextResponse.json({ code: "ATTACHMENT_CHANGED", expenseId }, { status: 409 });
    }
    console.error("deleteExpenseAttachment error:", error);
    return NextResponse.json(
      { error: "Failed to delete attachment" },
      { status: 400 }
    );
  }
}
