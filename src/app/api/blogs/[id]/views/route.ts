import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { recordBlogView } from "@/lib/blog/queries";
import {
  addBlogViewEntry,
  BLOG_VIEW_COOKIE_NAME,
  getBlogViewCookieOptions,
  hasRecentBlogView,
  parseBlogViewCookie,
  serializeBlogViewCookie,
} from "@/lib/blog/view-tracking";

type RouteContext = {
  params: { id: string };
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: RouteContext) {
  if (isAuthorizedAdminRequest(request)) {
    return new NextResponse(null, { status: 204 });
  }

  const blogId = params.id;

  if (!UUID_PATTERN.test(blogId)) {
    return new NextResponse(null, { status: 204 });
  }

  const cookieStore = cookies();
  const entries = parseBlogViewCookie(cookieStore.get(BLOG_VIEW_COOKIE_NAME)?.value);

  if (hasRecentBlogView(entries, blogId)) {
    return new NextResponse(null, { status: 204 });
  }

  const recorded = await recordBlogView(blogId);
  const response = new NextResponse(null, { status: 204 });

  if (recorded) {
    response.cookies.set(
      BLOG_VIEW_COOKIE_NAME,
      serializeBlogViewCookie(addBlogViewEntry(entries, blogId)),
      getBlogViewCookieOptions()
    );
  }

  return response;
}
