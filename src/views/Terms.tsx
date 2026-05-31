import { getTranslations } from "next-intl/server";

import { Layout } from "@/components/layout/Layout";
import type { AppLocale } from "@/i18n/routing";
import { APP_NAME } from "@/lib/constants";
import { getLocalizedCanonicalUrl } from "@/lib/seo-i18n";

type TermsPageProps = {
  locale: AppLocale;
};

export default async function TermsPage({ locale }: TermsPageProps) {
  const t = await getTranslations("terms");
  const pageUrl = getLocalizedCanonicalUrl(locale, "/terms");
  const homeUrl = getLocalizedCanonicalUrl(locale, "/");

  const termsJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("jsonLdName", { appName: APP_NAME }),
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: APP_NAME,
      url: homeUrl,
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
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
          name: t("breadcrumbTerms"),
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(termsJsonLd) }}
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
              <p>{t("section1Body", { appName: APP_NAME })}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                {t("section2Title")}
              </h2>
              <p>{t("section2Body", { appName: APP_NAME })}</p>
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
                <li>{t("section3Item4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                {t("section4Title")}
              </h2>
              <p>{t("section4Intro", { appName: APP_NAME })}</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>{t("section4Item1")}</li>
                <li>{t("section4Item2")}</li>
                <li>{t("section4Item3")}</li>
                <li>{t("section4Item4")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                {t("section5Title")}
              </h2>
              <p>{t("section5Body", { appName: APP_NAME })}</p>
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

            <section>
              <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
                {t("section8Title")}
              </h2>
              <p>{t("section8Body")}</p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
