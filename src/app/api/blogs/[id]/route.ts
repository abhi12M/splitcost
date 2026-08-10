import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { deleteBlog, getBlogById, updateBlog } from "@/lib/blog/queries";
import { estimateReadingTime, slugify } from "@/lib/blog/utils";
import type { BlogInput } from "@/lib/blog/types";

type RouteContext = {
  params: { id: string };
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

function normalizePayload(body: BlogInput): BlogInput {
  return {
    ...body,
    title: body.title?.trim() || null,
    slug: slugify(body.slug || body.title || "") || null,
    excerpt: body.excerpt?.trim() || null,
    category: body.category?.trim() || null,
    author: body.author?.trim() || "SplitCost Team",
    reading_time: body.reading_time ?? estimateReadingTime(body.content ?? ""),
    no_index: body.no_index ?? false,
    is_featured: body.is_featured ?? false,
    schema_json: body.schema_json ?? null,
  };
}

export async function GET(_req: Request, { params }: RouteContext) {
  const blog = await getBlogById(params.id);
  if (!blog) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }
  return NextResponse.json(blog);
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const payload = normalizePayload(await req.json());
    if (
      payload.status === "published" &&
      (!payload.title || !payload.slug || !payload.excerpt || !payload.category)
    ) {
      return NextResponse.json({ error: "Missing required blog fields" }, { status: 400 });
    }
    const blog = await updateBlog(params.id, payload);
    revalidatePath("/portal/x7k2p9/blogs");
    return NextResponse.json(blog);
  } catch (error: unknown) {
    console.error("updateBlog error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update blog") },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    await deleteBlog(params.id);
    revalidatePath("/portal/x7k2p9/blogs");
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to delete blog") },
      { status: 400 }
    );
  }
}
