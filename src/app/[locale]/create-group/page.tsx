import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { buildLocalizedMetadata, getLocalizedCanonicalUrl } from "@/lib/seo-i18n";
import { getWebPageId, getWebsiteId } from "@/lib/schema-identity";
import { serializeStructuredDataForHtml } from "@/lib/blog/schema";
import AddGroupPage from "@/views/AddGroup";

type PageProps = {
  params: { locale: AppLocale } | Promise<{ locale: AppLocale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: "metadata.createGroup" });

  return buildLocalizedMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/create-group",
  });
}

export default async function Page({ params }: PageProps) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "metadata.createGroup" });
  const pageUrl = getLocalizedCanonicalUrl(locale, "/create-group");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": getWebPageId(pageUrl),
    name: t("title"),
    description: t("description"),
    url: pageUrl,
    isPartOf: { "@id": getWebsiteId() },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredDataForHtml(jsonLd) }}
      />
      <AddGroupPage />
    </>
  );
}
