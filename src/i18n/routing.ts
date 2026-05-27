import { defineRouting } from "next-intl/routing";

export const locales = ["en", "es", "pt", "hi"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "en";

/** URL prefix for every public page (e.g. /en/groups). Required for multilingual SEO. */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});
