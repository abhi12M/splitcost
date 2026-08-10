export const BLOG_VIEW_COOKIE_NAME = "sc_blog_views";
export const BLOG_VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const BLOG_VIEW_COOKIE_MAX_AGE_SECONDS = BLOG_VIEW_WINDOW_MS / 1000;

export type BlogViewCookieEntry = {
  id: string;
  t: number;
};

export function parseBlogViewCookie(value: string | undefined): BlogViewCookieEntry[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (entry): entry is BlogViewCookieEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as BlogViewCookieEntry).id === "string" &&
        typeof (entry as BlogViewCookieEntry).t === "number"
    );
  } catch {
    return [];
  }
}

export function pruneBlogViewEntries(
  entries: BlogViewCookieEntry[],
  now = Date.now()
): BlogViewCookieEntry[] {
  return entries.filter((entry) => now - entry.t < BLOG_VIEW_WINDOW_MS);
}

export function hasRecentBlogView(
  entries: BlogViewCookieEntry[],
  blogId: string,
  now = Date.now()
): boolean {
  return pruneBlogViewEntries(entries, now).some((entry) => entry.id === blogId);
}

export function addBlogViewEntry(
  entries: BlogViewCookieEntry[],
  blogId: string,
  now = Date.now()
): BlogViewCookieEntry[] {
  const pruned = pruneBlogViewEntries(entries, now).filter((entry) => entry.id !== blogId);
  return [...pruned, { id: blogId, t: now }];
}

export function serializeBlogViewCookie(entries: BlogViewCookieEntry[]): string {
  return JSON.stringify(pruneBlogViewEntries(entries));
}

export function getBlogViewCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: BLOG_VIEW_COOKIE_MAX_AGE_SECONDS,
  };
}
