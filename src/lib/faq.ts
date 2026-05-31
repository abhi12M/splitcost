import { localeDefinitions } from "@/i18n/config";
import type { AppLocale } from "@/i18n/routing";
import { APP_NAME } from "@/lib/constants";
import { getLocalizedCanonicalUrl } from "@/lib/seo-i18n";

export const FAQ_KEYS = [
  "whatIs",
  "currencies",
  "account",
  "attachments",
  "splitMethods",
  "multiplePayers",
  "travel",
  "export",
  "mobile",
  "whoCanUse",
] as const;

export type FaqKey = (typeof FAQ_KEYS)[number];

export type FaqItem = {
  question: string;
  answer: string;
};

type FaqTranslator = (
  key: `${FaqKey}.question` | `${FaqKey}.answer`,
  values: { appName: string }
) => string;

export function getFaqItems(t: FaqTranslator): FaqItem[] {
  const values = { appName: APP_NAME };

  return FAQ_KEYS.map((key) => ({
    question: t(`${key}.question`, values),
    answer: t(`${key}.answer`, values),
  }));
}

export function buildFaqPageJsonLd(items: FaqItem[], locale: AppLocale) {
  const pageUrl = getLocalizedCanonicalUrl(locale, "/");
  const { htmlLang } = localeDefinitions[locale];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    inLanguage: htmlLang,
    mainEntity: items.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
