import { NextResponse } from "next/server";

import { incrementBlogViews } from "@/lib/blog/queries";

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  try {
    const params =
      context.params instanceof Promise ? await context.params : context.params;
    await incrementBlogViews(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("incrementBlogViews error:", error);
    return NextResponse.json({ error: "Failed to update views" }, { status: 400 });
  }
}
