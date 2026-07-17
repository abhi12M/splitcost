import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { slugify } from "@/lib/blog/utils";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  const extension = file.name.split(".").pop() || "jpg";
  const baseName = slugify(file.name.replace(/\.[^.]+$/, "")) || "blog-image";
  const path = `${Date.now()}-${baseName}.${extension}`;

  const { error } = await supabaseAdmin.storage
    .from("blog-images")
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data } = supabaseAdmin.storage
    .from("blog-images")
    .getPublicUrl(path);

  return NextResponse.json({ url: data.publicUrl });
}
