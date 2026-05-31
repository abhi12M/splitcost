import { ArrowRight, Scale, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { brandStyles, landingSection } from "@/lib/brand-styles";
import { APP_NAME } from "@/lib/constants";
import {
  COMPARE_INDEX_PATH,
  COMPARE_LIST,
  getCompareMeta,
  getComparePath,
} from "@/lib/compare";
import { getLocalizedCanonicalUrl } from "@/lib/seo-i18n";
import { cn } from "@/lib/utils";

type CompareIndexPageProps = {
  locale: AppLocale;
};

export default async function CompareIndexPage({ locale }: CompareIndexPageProps) {
  const t = await getTranslations("comparePages.index");

  const pageUrl = getLocalizedCanonicalUrl(locale, COMPARE_INDEX_PATH);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("jsonLdName", { appName: APP_NAME }),
    description: t("jsonLdDescription", { appName: APP_NAME }),
    url: pageUrl,
    isPartOf: {
      "@type": "WebSite",
      name: APP_NAME,
      url: getLocalizedCanonicalUrl(locale, "/"),
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: t("breadcrumbHome"),
          item: getLocalizedCanonicalUrl(locale, "/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: t("breadcrumbCompare"),
          item: pageUrl,
        },
      ],
    },
    hasPart: COMPARE_LIST.map((item) => ({
      "@type": "WebPage",
      name: t("cards." + item.slug + ".title", {
        appName: APP_NAME,
        competitor: item.competitorName,
      }),
      url: getLocalizedCanonicalUrl(locale, getComparePath(item.slug)),
    })),
  };

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className={cn(landingSection.default, landingSection.padding)}>
        <div className="container">
          <header className="mx-auto mb-12 max-w-3xl text-center md:mb-16">
            <p className={cn("mb-5", brandStyles.sectionBadge)}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {t("badge")}
            </p>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-tight">
              {t("title")}{" "}
              <span className={brandStyles.headingAccent}>{t("titleHighlight")}</span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
              {t("description", { appName: APP_NAME })}
            </p>
          </header>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {COMPARE_LIST.map((item) => (
              <article
                key={item.slug}
                className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-shadow hover:shadow-md dark:border-border/80"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary-muted">
                  <Scale className="h-6 w-6 text-primary dark:text-primary/90" aria-hidden />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  {t(`cards.${item.slug}.title`, {
                    appName: APP_NAME,
                    competitor: getCompareMeta(item.slug).competitorName,
                  })}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {t(`cards.${item.slug}.summary`, {
                    appName: APP_NAME,
                    competitor: item.competitorName,
                  })}
                </p>
                <Button asChild variant="outline" className="mt-5 w-full rounded-xl">
                  <Link href={getComparePath(item.slug)}>
                    {t("cardLinkLabel")}
                    <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </article>
            ))}
          </div>

          <div className={cn("mx-auto mt-10 max-w-3xl p-6 text-center sm:mt-12 sm:p-8", brandStyles.ctaPanel)}>
            <h2 className="text-balance text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {t("cta.title", { appName: APP_NAME })}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("cta.description")}
            </p>
            <Button asChild size="lg" className="mt-6 h-11 rounded-xl px-6 text-sm font-semibold sm:h-12 sm:text-base">
              <Link href="/create-group">
                {t("cta.button")}
                <ArrowRight className="ml-1 h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
