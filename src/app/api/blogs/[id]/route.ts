import { NextResponse } from "next/server";

import { deleteBlog, getBlogById, updateBlog } from "@/lib/blog/queries";
import { estimateReadingTime, slugify } from "@/lib/blog/utils";
import type { BlogInput } from "@/lib/blog/types";

type RouteContext = {
  params: { id: string };
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizePayload(body: BlogInput): BlogInput {
  return {
    ...body,
    title: body.title?.trim(),
    slug: slugify(body.slug || body.title),
    excerpt: body.excerpt?.trim(),
    author: body.author?.trim() || "SplitCost Team",
    reading_time: body.reading_time ?? estimateReadingTime(body.content ?? ""),
    no_index: body.no_index ?? false,
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
    const blog = await updateBlog(params.id, payload);
    return NextResponse.json(blog);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update blog") },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    await deleteBlog(params.id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to delete blog") },
      { status: 400 }
    );
  }
}
