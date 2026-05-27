import type { AppLocale } from "./routing";

export type LocaleDefinition = {
  code: AppLocale;
  /** BCP 47 tag for `<html lang>` */
  htmlLang: string;
  /** Open Graph locale (e.g. en_US) */
  openGraphLocale: string;
  /** hreflang value */
  hreflang: string;
  label: string;
  nativeLabel: string;
};

export const localeDefinitions: Record<AppLocale, LocaleDefinition> = {
  en: {
    code: "en",
    htmlLang: "en",
    openGraphLocale: "en_US",
    hreflang: "en",
    label: "English",
    nativeLabel: "English",
  },
  es: {
    code: "es",
    htmlLang: "es",
    openGraphLocale: "es_ES",
    hreflang: "es",
    label: "Spanish",
    nativeLabel: "Español",
  },
  pt: {
    code: "pt",
    htmlLang: "pt",
    openGraphLocale: "pt_BR",
    hreflang: "pt",
    label: "Portuguese",
    nativeLabel: "Português",
  },
  hi: {
    code: "hi",
    htmlLang: "hi",
    openGraphLocale: "hi_IN",
    hreflang: "hi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
  },
};

export const localeList = Object.values(localeDefinitions);
