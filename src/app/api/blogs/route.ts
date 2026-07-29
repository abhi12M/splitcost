import { NextResponse } from "next/server";

import { createBlog, listAllBlogs } from "@/lib/blog/queries";
import { estimateReadingTime, slugify } from "@/lib/blog/utils";
import type { BlogInput } from "@/lib/blog/types";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Failed to create blog";
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
    if (
      payload.status === "published" &&
      (!payload.title || !payload.slug || !payload.excerpt || !payload.category)
    ) {
      return NextResponse.json({ error: "Missing required blog fields" }, { status: 400 });
    }
    const blog = await createBlog(payload);
    return NextResponse.json(blog);
  } catch (error: unknown) {
    console.error("createBlog error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}
