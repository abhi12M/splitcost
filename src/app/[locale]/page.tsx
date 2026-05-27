import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { buildFaqPageJsonLd, getFaqItems } from "@/lib/faq";
import { buildLocalizedMetadata } from "@/lib/seo-i18n";
import HomePage from "@/views/Index";

type PageProps = {
  params: { locale: AppLocale } | Promise<{ locale: AppLocale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: "metadata.home" });

  return buildLocalizedMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/",
  });
}

export default async function Page({ params }: PageProps) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const tFaq = await getTranslations({ locale, namespace: "faq" });
  const faqItems = getFaqItems((key, values) => tFaq(key, values));
  const faqJsonLd = buildFaqPageJsonLd(faqItems, locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomePage />
    </>
  );
}
