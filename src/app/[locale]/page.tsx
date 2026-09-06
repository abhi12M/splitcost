import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { buildFaqPageJsonLd, getFaqItems } from "@/lib/faq";
import { serializeStructuredDataForHtml } from "@/lib/blog/schema";
import { getSoftwareApplicationId } from "@/lib/schema-identity";
import { getCanonicalUrl, SITE_NAME } from "@/lib/seo";
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
  const tHome = await getTranslations({ locale, namespace: "metadata.home" });
  const tFeatures = await getTranslations({ locale, namespace: "metadata.softwareApplication.features" });
  const faqItems = getFaqItems((key, values) => tFaq(key, values));
  const faqJsonLd = buildFaqPageJsonLd(faqItems, locale);
  const featureList = ["one", "two", "three", "four", "five", "six", "seven"].map((key) =>
    tFeatures(key as "one")
  );
  const softwareApplicationJsonLd =
    locale === "en"
      ? {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "@id": getSoftwareApplicationId(),
          name: SITE_NAME,
          url: getCanonicalUrl("/en"),
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web",
          description: tHome("description"),
          inLanguage: "en",
          featureList,
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredDataForHtml(faqJsonLd) }}
      />
      {softwareApplicationJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeStructuredDataForHtml(softwareApplicationJsonLd) }}
        />
      ) : null}
      <HomePage />
    </>
  );
}
