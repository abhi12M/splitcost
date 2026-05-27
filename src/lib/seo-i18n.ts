import type { Metadata } from "next";

import { localeDefinitions, localeList } from "@/i18n/config";
import type { AppLocale } from "@/i18n/routing";
import { locales } from "@/i18n/routing";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  getCanonicalUrl,
  getSiteUrl,
} from "@/lib/seo";

function normalizePath(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

/** Path without locale prefix (e.g. /groups). */
export function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0] as AppLocale)) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname || "/";
}

export function getLocalizedPath(locale: AppLocale, path: string): string {
  const normalized = normalizePath(path);
  if (normalized === "/") {
    return `/${locale}`;
  }
  return `/${locale}${normalized}`;
}

export function getLocalizedCanonicalUrl(
  locale: AppLocale,
  path: string
): string {
  return getCanonicalUrl(getLocalizedPath(locale, path));
}

type HreflangAlternate = {
  hreflang: string;
  url: string;
};

export function getHreflangAlternates(path: string): HreflangAlternate[] {
  const normalized = normalizePath(path);
  const alternates = localeList.map(({ code, hreflang }) => ({
    hreflang,
    url: getLocalizedCanonicalUrl(code, normalized),
  }));

  alternates.push({
    hreflang: "x-default",
    url: getLocalizedCanonicalUrl("en", normalized),
  });

  return alternates;
}

type BuildLocalizedMetadataArgs = {
  locale: AppLocale;
  title: string;
  description: string;
  /** Path without locale prefix */
  path: string;
  noIndex?: boolean;
};

export function buildPrivateRouteMetadata(
  locale: AppLocale,
  path: string,
  title: string,
  description: string
): Metadata {
  return buildLocalizedMetadata({
    locale,
    title,
    description,
    path,
    noIndex: true,
  });
}

export function buildLocalizedMetadata({
  locale,
  title,
  description,
  path,
  noIndex = false,
}: BuildLocalizedMetadataArgs): Metadata {
  const normalized = normalizePath(path);
  const canonicalUrl = getLocalizedCanonicalUrl(locale, normalized);
  const { openGraphLocale } = localeDefinitions[locale];
  const languages = Object.fromEntries(
    getHreflangAlternates(normalized).map(({ hreflang, url }) => [hreflang, url])
  );

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages,
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
      locale: openGraphLocale,
      alternateLocale: localeList
        .filter((entry) => entry.code !== locale)
        .map((entry) => entry.openGraphLocale),
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

/** Indexable marketing routes (path without locale). */
export const INDEXABLE_PATHS = [
  "/",
  "/contact",
  "/create-group",
  "/privacy",
  "/terms",
] as const;

export function buildLocaleSitemapEntries(): {
  url: string;
  lastModified: Date;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
}[] {
  const now = new Date();
  const priorities: Record<
    (typeof INDEXABLE_PATHS)[number],
    { changeFrequency: "daily" | "weekly" | "monthly" | "yearly"; priority: number }
  > = {
    "/": { changeFrequency: "daily", priority: 1 },
    "/contact": { changeFrequency: "monthly", priority: 0.7 },
    "/create-group": { changeFrequency: "weekly", priority: 0.8 },
    "/privacy": { changeFrequency: "yearly", priority: 0.4 },
    "/terms": { changeFrequency: "yearly", priority: 0.4 },
  };

  return locales.flatMap((locale) =>
    INDEXABLE_PATHS.map((path) => ({
      url: getLocalizedCanonicalUrl(locale, path),
      lastModified: now,
      ...priorities[path],
    }))
  );
}

export function getSiteRootAlternates(): Metadata["alternates"] {
  return {
    canonical: getLocalizedCanonicalUrl("en", "/"),
    languages: Object.fromEntries(
      getHreflangAlternates("/").map(({ hreflang, url }) => [hreflang, url])
    ),
  };
}

export { getSiteUrl };
