import { NextResponse } from "next/server";

import { createBlog, listAllBlogs } from "@/lib/blog/queries";
import { estimateReadingTime, slugify } from "@/lib/blog/utils";
import type { BlogInput } from "@/lib/blog/types";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to create blog";
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

export async function GET() {
  const blogs = await listAllBlogs();
  return NextResponse.json(blogs);
}

export async function POST(req: Request) {
  try {
    const payload = normalizePayload(await req.json());
    if (!payload.title || !payload.slug || !payload.excerpt || !payload.category) {
      return NextResponse.json({ error: "Missing required blog fields" }, { status: 400 });
    }
    const blog = await createBlog(payload);
    return NextResponse.json(blog);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}
