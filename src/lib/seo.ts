import type { Metadata } from "next";

export const SITE_NAME = "Splitcost";
export const SITE_TITLE =
  "Splitcost | Split expenses with friends, roommates, and travel groups";
export const SITE_DESCRIPTION =
  "Splitcost is a free group expense tracker that helps friends, roommates, and travel groups split bills, support multiple payers per expense, edit group details, track balances, and settle up faster.";
export const SITE_KEYWORDS = [
  "split expenses",
  "expense splitter",
  "group expense tracker",
  "trip expense tracker",
  "roommate expense tracker",
  "bill split calculator",
  "shared expense app",
  "settle up app",
  "split bills with friends",
  "travel expense app",
  "multiple payers expense tracker",
  "shared expense app no signup",
  "edit group expenses",
];
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
    keywords: SITE_KEYWORDS,
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
