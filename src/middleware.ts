import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);
const publishedBlogPath = /^\/en\/blog\/([^/]+)\/?$/;
const canonicalBlogSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BLOG_REDIRECT_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";

type BlogRedirectRow = { blogs: { slug?: string | null; status?: string | null } | null };

async function resolvePublishedBlogRedirect(oldSlug: string) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const endpoint = new URL("/rest/v1/blog_slug_redirects", supabaseUrl);
  endpoint.searchParams.set("select", "blogs!inner(slug,status)");
  endpoint.searchParams.set("old_slug", `eq.${oldSlug}`);
  endpoint.searchParams.set("blogs.status", "eq.published");
  endpoint.searchParams.set("limit", "1");

  try {
    const response = await fetch(endpoint, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }, cache: "no-store" });
    if (!response.ok) return null;
    const rows = (await response.json()) as BlogRedirectRow[];
    const targetSlug = rows[0]?.blogs?.slug;
    return targetSlug && targetSlug !== oldSlug && canonicalBlogSlug.test(targetSlug) ? targetSlug : null;
  } catch {
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(publishedBlogPath);
  if (match && canonicalBlogSlug.test(match[1])) {
    const targetSlug = await resolvePublishedBlogRedirect(match[1]);
    if (targetSlug) {
      const response = NextResponse.redirect(new URL(`/en/blog/${encodeURIComponent(targetSlug)}`, request.url), 307);
      response.headers.set("Cache-Control", BLOG_REDIRECT_CACHE_CONTROL);
      return response;
    }
  }
  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/", "/(en|es|pt|hi)/:path*", "/((?!api|_next|_vercel|portal|.*\\..*).*)", "/api/:path*", "/portal/:path*"],
};
