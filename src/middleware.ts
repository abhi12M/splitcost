import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const ADMIN_COOKIE = "splitcost_admin_session";
const adminApiPrefixes = [
  "/api/admin-media",
  "/api/blog-images",
  "/api/blogs",
  "/api/blog-categories",
];

function bytesEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function hasValidAdminSession(request: NextRequest) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const value = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!secret || !value) return false;

  const match = /^admin\.(\d+)\.([A-Za-z0-9_-]+)$/.exec(value);
  if (!match || Number(match[1]) < Math.floor(Date.now() / 1000)) return false;

  const payload = `admin.${match[1]}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  const encoded = match[2].replace(/-/g, "+").replace(/_/g, "/");
  const supplied = Uint8Array.from(atob(encoded.padEnd(encoded.length + ((4 - encoded.length % 4) % 4), "=")), (char) => char.charCodeAt(0));
  return bytesEqual(signature, supplied);
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRequest = pathname.startsWith("/api/");
  const isUnsafeApiRequest = isApiRequest && !["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (process.env.NODE_ENV === "production" && isUnsafeApiRequest && request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin API requests are not allowed" }, { status: 403 });
  }

  // Article view counting is intentionally public; the rest of the blog CMS is
  // an admin surface.
  const isPublicBlogViewEndpoint = /^\/api\/blogs\/[^/]+\/views$/.test(pathname);
  const isAdminApi = !isPublicBlogViewEndpoint && adminApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (isAdminApi && !await hasValidAdminSession(request)) {
    return NextResponse.json({ error: "Admin authentication required" }, { status: 401 });
  }

  // API endpoints must never be locale-prefixed. The checks above still run,
  // but next-intl is only for page navigation.
  if (isApiRequest) {
    return NextResponse.next();
  }

  // Portal paths intentionally live outside the locale tree. Do not pass them
  // to next-intl, otherwise /portal/login is redirected to /en/portal/login
  // and the configured portal redirect creates a loop.
  if (pathname === "/portal" || pathname.startsWith("/portal/")) {
    // Protect portal pages before server components fetch and render dashboard
    // data. A client-side gate alone runs too late to protect SSR output.
    if (pathname !== "/portal/login" && !await hasValidAdminSession(request)) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/",
    "/(en|es|pt|hi)/:path*",
    "/((?!api|_next|_vercel|portal|.*\\..*).*)",
    "/api/:path*",
    "/portal/:path*",
  ],
};
