import { NextResponse } from "next/server";

import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import {
  createBlogCategory,
  listBlogCategoriesWithCounts,
} from "@/lib/blog/category-queries";
import type { BlogCategoryInput } from "@/lib/blog/categories";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Failed to manage blog category";
}

export async function GET(request: Request) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const categories = await listBlogCategoriesWithCounts();
    return NextResponse.json(categories);
  } catch (error: unknown) {
    console.error("listBlogCategories error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as BlogCategoryInput;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }
    const category = await createBlogCategory(body);
    return NextResponse.json(category);
  } catch (error: unknown) {
    console.error("createBlogCategory error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
