import { NextResponse } from "next/server";
import sharp from "sharp";

import { supabaseAdmin } from "@/lib/supabase/server";
import {
  buildAttachmentPayload,
  getStoragePathFromValue,
} from "@/lib/supabase/attachments";
import { buildAdminMediaPath } from "@/lib/supabase/storagePaths";

const MEDIA_BUCKET = "blog-images";
const MAX_MEDIA_IMAGE_SIZE = 10 * 1024 * 1024;

type AdminMediaItem = {
  path: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  updatedAt: string | null;
  source: "admin";
};

type ExpenseAttachmentMediaItem = Omit<AdminMediaItem, "source"> & {
  source: "expense";
  expense: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    groupName: string;
  };
};

type MediaFile = {
  name: string;
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: {
    size?: number;
    mimetype?: string;
  } | null;
};

type ExpenseAttachmentRow = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  attachment_data_url: string | null;
  groups?:
    | { id?: string | null; name?: string | null }
    | { id?: string | null; name?: string | null }[]
    | null;
};

async function listFiles(folder: string): Promise<MediaFile[]> {
  const { data, error } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .list(folder, {
      limit: 1000,
      offset: 0,
      sortBy: { column: "updated_at", order: "desc" },
    });

  if (error) {
    throw error;
  }

  const entries = data ?? [];
  const files = entries.filter((entry) => entry.id);
  const folders = entries.filter((entry) => !entry.id);
  const nested = await Promise.all(
    folders.map((entry) => listFiles(folder ? `${folder}/${entry.name}` : entry.name))
  );

  return [
    ...files.map((entry) => ({
      ...entry,
      name: folder ? `${folder}/${entry.name}` : entry.name,
    })),
    ...nested.flat(),
  ];
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") && file.size <= MAX_MEDIA_IMAGE_SIZE;
}

function getGroup(group: ExpenseAttachmentRow["groups"]) {
  if (Array.isArray(group)) {
    return group[0] ?? null;
  }

  return group ?? null;
}

async function listAdminUploads(): Promise<AdminMediaItem[]> {
  const files = await listFiles("");

  return files
    .filter((file) => {
      const mimeType = file.metadata?.mimetype ?? "";
      return mimeType.startsWith("image/") || /\.(jpe?g|png|gif|webp|avif)$/i.test(file.name);
    })
    .map((file) => {
      const { data } = supabaseAdmin.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(file.name);
      const updatedAt = file.updated_at ?? file.created_at ?? null;
      const version = updatedAt ? new Date(updatedAt).getTime() : null;

      return {
        path: file.name,
        name: file.name.split("/").pop() ?? file.name,
        url: version ? `${data.publicUrl}?v=${version}` : data.publicUrl,
        size: file.metadata?.size ?? 0,
        mimeType: file.metadata?.mimetype ?? "image/*",
        updatedAt,
        source: "admin" as const,
      };
    });
}

async function listExpenseAttachments(): Promise<ExpenseAttachmentMediaItem[]> {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select("id, description, amount, currency, date, attachment_data_url, groups(id, name)")
    .not("attachment_data_url", "is", null)
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ExpenseAttachmentRow[];
  const media = await Promise.all<ExpenseAttachmentMediaItem | null>(
    rows.map(async (expense) => {
      const path = getStoragePathFromValue(expense.attachment_data_url);
      if (!path) return null;

      try {
        const attachment = await buildAttachmentPayload(path);
        const group = getGroup(expense.groups);

        return {
          path,
          name: attachment.name,
          url: attachment.url,
          size: attachment.size,
          mimeType: attachment.type,
          updatedAt: attachment.updatedAt,
          source: "expense" as const,
          expense: {
            id: expense.id,
            description: expense.description,
            amount: expense.amount,
            currency: expense.currency,
            date: expense.date,
            groupId: group?.id ?? null,
            groupName: group?.name ?? "Unknown group",
          },
        };
      } catch (error) {
        console.error("listExpenseAttachment error:", {
          expenseId: expense.id,
          path,
          error,
        });
        return null;
      }
    })
  );

  return media.filter((item): item is ExpenseAttachmentMediaItem => Boolean(item));
}

export async function GET() {
  try {
    const media: (AdminMediaItem | ExpenseAttachmentMediaItem)[] = [
      ...(await listAdminUploads()),
      ...(await listExpenseAttachments()),
    ]
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? 0).getTime();
        const bTime = new Date(b.updatedAt ?? 0).getTime();
        return bTime - aTime;
      });

    return NextResponse.json({ media });
  } catch (error) {
    console.error("listAdminMedia error:", error);
    return NextResponse.json(
      { error: "Unable to load media" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  if (!isImageFile(file)) {
    return NextResponse.json(
      { error: "Upload an image that is 10 MB or smaller" },
      { status: 400 }
    );
  }

  try {
    const image = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .webp({ quality: 85 })
      .toBuffer();
    const path = buildAdminMediaPath();

    const { error } = await supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .upload(path, image, {
        contentType: "image/webp",
        cacheControl: "3600",
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data } = supabaseAdmin.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(path);

    return NextResponse.json({
      media: {
        path,
        name: path.split("/").pop() ?? path,
        url: data.publicUrl,
        size: image.length,
        mimeType: "image/webp",
        updatedAt: new Date().toISOString(),
        source: "admin",
      },
    });
  } catch (error) {
    console.error("uploadAdminMedia error:", error);
    return NextResponse.json(
      { error: "Unable to process image" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  const { path, paths } = (await req.json().catch(() => ({}))) as {
    path?: string;
    paths?: string[];
  };
  const mediaPaths = paths?.filter(Boolean) ?? (path ? [path] : []);

  if (!mediaPaths.length) {
    return NextResponse.json({ error: "At least one media path is required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .remove(mediaPaths);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
