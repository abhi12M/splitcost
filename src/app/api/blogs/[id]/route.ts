import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import { normalizeBlogInput } from "@/lib/blog/input";
import { deleteBlog, getBlogById, updateBlog } from "@/lib/blog/queries";

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

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  const blog = await getBlogById(params.id);
  if (!blog) {
    return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  }
  return NextResponse.json(blog);
}

export async function PUT(req: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(req)) return unauthorized();
  try {
    const payload = normalizeBlogInput(await req.json());
    if (
      payload.status === "published" &&
      (!payload.title || !payload.slug || !payload.excerpt)
    ) {
      return NextResponse.json({ error: "Missing required blog fields" }, { status: 400 });
    }
    const blog = await updateBlog(params.id, payload);
    revalidatePath("/portal/x7k2p9/blogs");
    return successJson(blog, SUCCESS_MESSAGES.blogUpdated);
  } catch (error: unknown) {
    console.error("updateBlog error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to update blog") },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) return unauthorized();
  try {
    await deleteBlog(params.id);
    revalidatePath("/portal/x7k2p9/blogs");
    return successJson({ ok: true }, SUCCESS_MESSAGES.blogDeleted);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error, "Failed to delete blog") },
      { status: 400 }
    );
  }
}
