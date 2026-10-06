import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { createBlog, listAllBlogs } from "@/lib/blog/queries";
import { normalizeBlogInput } from "@/lib/blog/input";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Failed to create blog";
}

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
  try {
    const payload = normalizeBlogInput(await req.json());
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
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 400 }
    );
  }
}
