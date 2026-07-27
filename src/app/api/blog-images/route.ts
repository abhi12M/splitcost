import { NextResponse } from "next/server";

import {
  BLOG_IMAGES_BUCKET,
  MAX_BLOG_IMAGE_SIZE_BYTES,
} from "@/lib/blog/types";
import { supabaseAdmin } from "@/lib/supabase/server";

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const alt = String(formData.get("alt") || "").trim();
    const caption = String(formData.get("caption") || "").trim();
    const widthRaw = formData.get("width");
    const heightRaw = formData.get("height");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Image file is required" },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image uploads are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_BLOG_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image must be 5 MB or smaller" },
        { status: 400 }
      );
    }

    const extension = file.name.includes(".")
      ? file.name.split(".").pop()
      : file.type.split("/")[1] || "jpg";
    const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "image";
    const path = `posts/${Date.now()}-${safeName}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BLOG_IMAGES_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: "31536000",
      });

    if (uploadError) {
      console.error("blog image upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 400 }
      );
    }

    const { data } = supabaseAdmin.storage
      .from(BLOG_IMAGES_BUCKET)
      .getPublicUrl(path);

    const width = widthRaw ? Number(widthRaw) : undefined;
    const height = heightRaw ? Number(heightRaw) : undefined;

    return NextResponse.json({
      url: data.publicUrl,
      path,
      alt: alt || undefined,
      caption: caption || undefined,
      width: Number.isFinite(width) ? width : undefined,
      height: Number.isFinite(height) ? height : undefined,
    });
  } catch (error) {
    console.error("blog-images error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload image",
      },
      { status: 400 }
    );
  }
}
