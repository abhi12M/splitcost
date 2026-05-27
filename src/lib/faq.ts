import { APP_NAME } from "@/lib/constants";
import { getCanonicalUrl } from "@/lib/seo";

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

export function buildFaqPageJsonLd(items: FaqItem[], locale = "en") {
  const pageUrl = getCanonicalUrl("/");

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    inLanguage: locale,
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
