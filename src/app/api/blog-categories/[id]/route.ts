import { NextResponse } from "next/server";

import {
  deleteBlogCategory,
  getBlogCategoryById,
  updateBlogCategory,
} from "@/lib/blog/category-queries";
import type { BlogCategoryInput } from "@/lib/blog/categories";

type RouteContext = {
  params: { id: string };
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Failed to manage blog category";
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const category = await getBlogCategoryById(params.id);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json(category);
  } catch (error: unknown) {
    console.error("getBlogCategoryById error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const body = (await req.json()) as Partial<BlogCategoryInput>;
    const category = await updateBlogCategory(params.id, body);
    return NextResponse.json(category);
  } catch (error: unknown) {
    console.error("updateBlogCategory error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    await deleteBlogCategory(params.id);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("deleteBlogCategory error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}
