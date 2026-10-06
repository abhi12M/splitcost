import { NextResponse } from "next/server";
import sharp from "sharp";

import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { supabaseAdmin } from "@/lib/supabase/server";
import { buildBlogImagePath } from "@/lib/supabase/storagePaths";

const BLOG_IMAGE_BUCKET = "blog-images";
const MAX_BLOG_IMAGE_SIZE = 10 * 1024 * 1024;

export async function POST(req: Request) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formData = await req.formData();
  const file = formData.get("file");
  const blogId = String(formData.get("blogId") ?? "").trim();
  const kind = formData.get("kind") === "cover" ? "cover" : "inline";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  if (!blogId) {
    return NextResponse.json({ error: "Blog ID is required" }, { status: 400 });
  }

  if (!file.type.startsWith("image/") || file.size > MAX_BLOG_IMAGE_SIZE) {
    return NextResponse.json(
      { error: "Upload an image that is 10 MB or smaller" },
      { status: 400 }
    );
  }

  const { data: blog, error: blogError } = await supabaseAdmin
    .from("blogs")
    .select("id,created_at")
    .eq("id", blogId)
    .maybeSingle();

  if (blogError || !blog) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }

  try {
    const image = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .webp({ quality: 85 })
      .toBuffer();
    const path = buildBlogImagePath(blog.id, file.name, new Date(blog.created_at));

    const { error } = await supabaseAdmin.storage
      .from(BLOG_IMAGE_BUCKET)
      .upload(path, image, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: kind === "cover",
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data } = supabaseAdmin.storage
      .from(BLOG_IMAGE_BUCKET)
      .getPublicUrl(path);
    const url =
      kind === "cover"
        ? `${data.publicUrl}?v=${Date.now()}`
        : data.publicUrl;

    return successJson({ url }, SUCCESS_MESSAGES.imageUploaded);
  } catch (error) {
    console.error("uploadBlogImage error:", error);
    return NextResponse.json(
      { error: "Unable to process image" },
      { status: 400 }
    );
  }
}
