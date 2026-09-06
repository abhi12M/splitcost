import { getSiteUrl } from "@/lib/seo";

function removeTrailingSlash(pathname: string) {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

/**
 * Normalize a public SplitCost page URL before using it as a schema identity.
 * Page IDs always use the configured canonical site origin, never an incoming
 * request origin, query string, or fragment.
 */
export function normalizeCanonicalPageUrl(value: string) {
  const siteUrl = getSiteUrl();
  const resolved = new URL(value, `${siteUrl}/`);
  const canonical = new URL(siteUrl);

  canonical.pathname = removeTrailingSlash(resolved.pathname || "/");
  canonical.search = "";
  canonical.hash = "";

  return canonical.toString().replace(/\/$/, "");
}

/** Normalize an image URL without changing its origin. */
export function normalizeSchemaImageUrl(value: string) {
  const imageUrl = new URL(value, `${getSiteUrl()}/`);
  imageUrl.pathname = removeTrailingSlash(imageUrl.pathname || "/");
  imageUrl.hash = "";

  return imageUrl.toString().replace(/\/$/, "");
}

export function getOrganizationId() {
  return `${getSiteUrl()}/#organization`;
}

export function getWebsiteId() {
  return `${getSiteUrl()}/#website`;
}

export function getSoftwareApplicationId() {
  return `${getSiteUrl()}/#software-application`;
}

export function getWebPageId(canonicalUrl: string) {
  return `${normalizeCanonicalPageUrl(canonicalUrl)}#webpage`;
}

export function getBlogPostingId(canonicalUrl: string) {
  return `${normalizeCanonicalPageUrl(canonicalUrl)}#blog-posting`;
}

export function getBreadcrumbId(canonicalUrl: string) {
  return `${normalizeCanonicalPageUrl(canonicalUrl)}#breadcrumb`;
}

export function getImageObjectId(imageUrl: string) {
  return `${normalizeSchemaImageUrl(imageUrl)}#image`;
}
