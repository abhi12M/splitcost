import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  EXPENSE_ATTACHMENT_BUCKET,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/lib/expenseAttachments";
import {
  buildAttachmentPayload,
  buildExpenseAttachmentPath,
  getExpenseAttachmentPath,
  setExpenseAttachmentPath,
} from "@/lib/supabase/attachments";

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

    const path = buildExpenseAttachmentPath(expenseId, file.name);
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
