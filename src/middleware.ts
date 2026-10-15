import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);
const publishedBlogPath = /^\/en\/blog\/([^/]+)\/?$/;
const canonicalBlogSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BLOG_REDIRECT_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";

// ---------------------------------------------------------------------------
// Rate limiting (Upstash Redis)
// ---------------------------------------------------------------------------

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const writeLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "60 s"), prefix: "rl:write" })
  : null;

const readLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, "60 s"), prefix: "rl:read" })
  : null;

const contactLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, "60 s"), prefix: "rl:contact" })
  : null;

const authLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "60 s"), prefix: "rl:auth" })
  : null;

// ---------------------------------------------------------------------------
// Request body size limits (Content-Length pre-check)
// ---------------------------------------------------------------------------

const BODY_LIMIT_JSON = 102_400; // 100 KB — most API routes
const BODY_LIMIT_LARGE_JSON = 512_000; // 512 KB — blog content
const BODY_LIMIT_UPLOAD = 10 * 1024 * 1024; // 10 MB — file uploads
const BODY_LIMIT_GROUP_IMPORT = 1_000_000; // 1 MB — a group created offline, with all its expenses

function pickBodyLimit(pathname: string, method: string): number {
  if (method === "POST" && pathname === "/api/groups/import") {
    return BODY_LIMIT_GROUP_IMPORT;
  }

  if (
    method === "POST" &&
    (pathname === "/api/blog-images" ||
      pathname === "/api/admin-media" ||
      /^\/api\/expenses\/[^/]+\/attachment$/.test(pathname))
  ) {
    return BODY_LIMIT_UPLOAD;
  }

  if (pathname.startsWith("/api/blogs")) {
    return BODY_LIMIT_LARGE_JSON;
  }

  return BODY_LIMIT_JSON;
}

function checkContentLength(request: NextRequest): NextResponse | null {
  const method = request.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const contentLength = request.headers.get("content-length");
  if (!contentLength) return null;

  const bytes = Number(contentLength);
  if (!Number.isFinite(bytes)) return null;

  if (bytes > pickBodyLimit(request.nextUrl.pathname, method)) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 }
    );
  }

  return null;
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    request.ip ||
    "unknown"
  );
}

function pickLimiter(pathname: string, method: string): Ratelimit | null {
  if (pathname.startsWith("/api/contact")) return contactLimiter;
  if (pathname.startsWith("/api/admin-session") || pathname.startsWith("/api/admin/session")) {
    return method === "POST" ? authLimiter : readLimiter;
  }
  if (method === "GET" || method === "HEAD") return readLimiter;
  return writeLimiter;
}

async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const limiter = pickLimiter(request.nextUrl.pathname, request.method);
  if (!limiter) return null;

  try {
    const ip = getClientIp(request);
    const result = await limiter.limit(ip);
    if (!result.success) {
      const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(result.limit),
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(result.reset),
          },
        }
      );
    }
  } catch (error) {
    console.error("Rate limit check failed:", error);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Blog slug redirects
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const sizeResponse = checkContentLength(request);
    if (sizeResponse) return sizeResponse;
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    return NextResponse.next();
  }

  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    return NextResponse.next();
  }

  const match = pathname.match(publishedBlogPath);
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
