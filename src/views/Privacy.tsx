import { getTranslations } from "next-intl/server";

import { Layout } from "@/components/layout/Layout";
import type { AppLocale } from "@/i18n/routing";
import { APP_NAME } from "@/lib/constants";
import { getLocalizedCanonicalUrl } from "@/lib/seo-i18n";
import { getBreadcrumbId, getWebPageId, getWebsiteId } from "@/lib/schema-identity";
import { serializeStructuredDataForHtml } from "@/lib/blog/schema";

type PrivacyPageProps = {
  locale: AppLocale;
};

export default async function PrivacyPage({ locale }: PrivacyPageProps) {
  const t = await getTranslations("privacy");
  const pageUrl = getLocalizedCanonicalUrl(locale, "/privacy");
  const homeUrl = getLocalizedCanonicalUrl(locale, "/");

  const privacyJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": getWebPageId(pageUrl),
    name: t("jsonLdName", { appName: APP_NAME }),
    url: pageUrl,
    isPartOf: { "@id": getWebsiteId() },
    breadcrumb: {
      "@type": "BreadcrumbList",
      "@id": getBreadcrumbId(pageUrl),
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: t("breadcrumbHome"),
          item: homeUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: t("breadcrumbPrivacy"),
          item: pageUrl,
        },
      ],
    },
  };

  return (
    <Layout>
      <div className="container py-12 md:py-[3rem] max-w-3xl">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeStructuredDataForHtml(privacyJsonLd) }}
        />

        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
            {t("title")}
          </h1>

          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
            <p className="text-base leading-7">{t("intro", { appName: APP_NAME })}</p>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                {t("section1Title")}
              </h2>
              <p>{t("section1Intro", { appName: APP_NAME })}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("section1Item1")}</li>
                <li>{t("section1Item2")}</li>
                <li>{t("section1Item3")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                {t("section2Title")}
              </h2>
              <p>{t("section2Body")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                {t("section3Title")}
              </h2>
              <p>{t("section3Intro")}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("section3Item1")}</li>
                <li>{t("section3Item2")}</li>
                <li>{t("section3Item3")}</li>
              </ul>
              <p>{t("section3Outro")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                {t("section4Title")}
              </h2>
              <p>{t("section4Body", { appName: APP_NAME })}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                {t("section5Title")}
              </h2>
              <p>{t("section5Intro")}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("section5Item1")}</li>
                <li>{t("section5Item2")}</li>
                <li>{t("section5Item3")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                {t("section6Title")}
              </h2>
              <p>{t("section6Body")}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                {t("section7Title")}
              </h2>
              <p>{t("section7Body")}</p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
