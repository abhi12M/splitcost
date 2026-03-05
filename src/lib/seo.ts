import type { Metadata } from "next";

export const SITE_NAME = "Splitcost";
export const SITE_TITLE = "Splitcost | Split expenses with friends and groups";
export const SITE_DESCRIPTION =
  "Splitcost helps groups split expenses quickly with shareable links, smart balances, and simple settlements.";
export const DEFAULT_OG_IMAGE = "/opengraph-image";

const FALLBACK_SITE_URL = "https://splitcost.in";

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

type BuildMetadataArgs = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  imagePath?: string;
  imageAlt?: string;
};

export function buildMetadata({
  title,
  description,
  path,
  noIndex = false,
  imagePath = DEFAULT_OG_IMAGE,
  imageAlt = `${SITE_NAME} preview`,
}: BuildMetadataArgs): Metadata {
  const canonicalPath = normalizePath(path);
  const canonicalUrl = getCanonicalUrl(canonicalPath);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
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
          url: imagePath,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imagePath],
    },
  };
}
