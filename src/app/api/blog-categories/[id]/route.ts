import { NextResponse } from "next/server";

import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { failureJson } from "@/lib/api/errors";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import {
  deleteBlogCategory,
  getBlogCategoryById,
  updateBlogCategory,
} from "@/lib/blog/category-queries";
import type { BlogCategoryInput } from "@/lib/blog/categories";

type RouteContext = {
  params: { id: string };
};

export async function GET(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const category = await getBlogCategoryById(params.id);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(category);
  } catch (error: unknown) {
    console.error("getBlogCategoryById error:", error);
    return failureJson(error, "Failed to load blog category", 500);
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = await readJsonObject(req, {
    allowedKeys: ["name", "slug", "description", "sort_order"],
  });
  if (!parsed.ok) return parsed.response;
  try {
    const body = parsed.data as Partial<BlogCategoryInput>;
    const category = await updateBlogCategory(params.id, body);
    return successJson(category, SUCCESS_MESSAGES.blogCategoryUpdated);
  } catch (error: unknown) {
    console.error("updateBlogCategory error:", error);
    return failureJson(error, "Failed to update blog category", 400);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await deleteBlogCategory(params.id);
    return successJson({ ok: true }, SUCCESS_MESSAGES.blogCategoryDeleted);
  } catch (error: unknown) {
    console.error("deleteBlogCategory error:", error);
    return failureJson(error, "Failed to delete blog category", 400);
  }
}
