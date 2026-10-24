import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { failureJson } from "@/lib/api/errors";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { createBlog, listAllBlogs } from "@/lib/blog/queries";
import { normalizeBlogInput } from "@/lib/blog/input";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const blogs = await listAllBlogs();
  return NextResponse.json(blogs);
}

export async function POST(req: Request) {
  if (!isAuthorizedAdminRequest(req)) return unauthorized();
  const parsed = await readJsonObject(req, {
    maxBytes: 512_000,
    allowedKeys: [
      "title", "slug", "excerpt", "content", "cover_image", "cover_alt",
      "category", "author", "status", "reading_time", "no_index", "is_featured",
    ],
  });
  if (!parsed.ok) return parsed.response;
  try {
    const payload = normalizeBlogInput(parsed.data);
    if (
      payload.status === "published" &&
      (!payload.title || !payload.slug || !payload.excerpt)
    ) {
      return NextResponse.json({ error: "Missing required blog fields" }, { status: 400 });
    }
    const blog = await createBlog(payload);
    revalidatePath("/portal/x7k2p9/blogs");
    return successJson(blog, SUCCESS_MESSAGES.blogCreated);
  } catch (error: unknown) {
    console.error("createBlog error:", error);
    return failureJson(error, "Failed to create blog", 400);
  }
}
