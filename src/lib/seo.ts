import type { Metadata } from "next";

export const SITE_NAME = "SplitCost";
export const SITE_TITLE =
  "SplitCost | Split expenses with friends, roommates, and travel groups";
export const SITE_DESCRIPTION =
  "SplitCost is a free group expense tracker that helps friends, roommates, and travel groups split bills, track balances, and settle up faster. It supports multiple payers per expense and lets you easily edit group details.";
export const DEFAULT_OG_IMAGE = "/og-image.png";

const FALLBACK_SITE_URL = "https://www.splitcost.in";

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK_SITE_URL;

  try {
    return normalizeBaseUrl(new URL(raw).toString());
  } catch {
    return FALLBACK_SITE_URL;
  }
}

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function getCanonicalUrl(path: string): string {
  return `${getSiteUrl()}${normalizePath(path)}`;
}

export function getCanonicalBlogUrl(slug: string): string {
  return getCanonicalUrl(`/en/blog/${encodeURIComponent(slug)}`);
}

type BuildMetadataArgs = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
};

export function buildMetadata({
  title,
  description,
  path,
  noIndex = false,
}: BuildMetadataArgs): Metadata {
  const canonicalPath = normalizePath(path);
  const canonicalUrl = getCanonicalUrl(canonicalPath);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : undefined,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} preview`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}
