import { NextResponse } from "next/server";

import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { failureJson } from "@/lib/api/errors";
import { readJsonObject } from "@/lib/api/request";
import { SUCCESS_MESSAGES, successJson } from "@/lib/api/success";
import {
  createBlogCategory,
  listBlogCategoriesWithCounts,
} from "@/lib/blog/category-queries";
import type { BlogCategoryInput } from "@/lib/blog/categories";

export async function GET(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const categories = await listBlogCategoriesWithCounts();
    return NextResponse.json(categories);
  } catch (error: unknown) {
    console.error("listBlogCategories error:", error);
    return failureJson(error, "Failed to load blog categories", 500);
  }
}

export async function POST(req: Request) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = await readJsonObject(req, {
    allowedKeys: ["name", "slug", "description", "sort_order"],
  });
  if (!parsed.ok) return parsed.response;
  try {
    const body = parsed.data as BlogCategoryInput;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }
    const category = await createBlogCategory(body);
    return successJson(category, SUCCESS_MESSAGES.blogCategoryCreated);
  } catch (error: unknown) {
    console.error("createBlogCategory error:", error);
    return failureJson(error, "Failed to create blog category", 400);
  }
}
