import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Home,
  Scale,
  Sparkles,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { brandStyles, landingSection } from "@/lib/brand-styles";
import { APP_NAME } from "@/lib/constants";
import { getComparePath } from "@/lib/compare";
import {
  RESOURCE_CATEGORY_SLUGS,
  RESOURCES_INDEX_PATH,
  getResourcesByCategory,
} from "@/lib/resources";
import { getLocalizedCanonicalUrl } from "@/lib/seo-i18n";
import { getBreadcrumbId, getWebPageId, getWebsiteId } from "@/lib/schema-identity";
import { serializeStructuredDataForHtml } from "@/lib/blog/schema";
import { getUseCasePath } from "@/lib/use-cases";
import { cn } from "@/lib/utils";

type ResourcesIndexPageProps = {
  locale: AppLocale;
};

export default async function ResourcesIndexPage({ locale }: ResourcesIndexPageProps) {
  const t = await getTranslations("resourcePages.index");

  const pageUrl = getLocalizedCanonicalUrl(locale, RESOURCES_INDEX_PATH);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": getWebPageId(pageUrl),
    name: t("jsonLdName", { appName: APP_NAME }),
    description: t("jsonLdDescription", { appName: APP_NAME }),
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
          item: getLocalizedCanonicalUrl(locale, "/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: t("breadcrumbResources"),
          item: pageUrl,
        },
      ],
    },
    hasPart: RESOURCE_CATEGORY_SLUGS.map((category) => ({
      "@type": "ItemList",
      name: t(`categories.${category}.title`),
      itemListElement: getResourcesByCategory(category).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: t(`items.${item.slug}.title`),
        url: item.url,
      })),
    })),
  };

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredDataForHtml(jsonLd) }}
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
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("intro", { appName: APP_NAME })}
            </p>
          </header>

          <div className="mx-auto max-w-4xl space-y-12">
            {RESOURCE_CATEGORY_SLUGS.map((category) => (
              <section key={category} aria-labelledby={`resources-${category}`}>
                <h2
                  id={`resources-${category}`}
                  className="text-xl font-bold text-foreground sm:text-2xl"
                >
                  {t(`categories.${category}.title`)}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t(`categories.${category}.description`)}
                </p>
                <ul className="mt-6 space-y-4">
                  {getResourcesByCategory(category).map((item) => (
                    <li key={item.slug}>
                      <article className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md dark:border-border/80 sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {item.source}
                            </p>
                            <h3 className="mt-1 text-base font-semibold text-foreground sm:text-lg">
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-start gap-1.5 rounded-sm transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                              >
                                <span>{t(`items.${item.slug}.title`)}</span>
                                <ExternalLink
                                  className="mt-1 h-4 w-4 shrink-0 opacity-60"
                                  aria-hidden
                                />
                                <span className="sr-only">{t("externalLinkLabel")}</span>
                              </a>
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {t(`items.${item.slug}.summary`)}
                            </p>
                          </div>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <section
            className="mx-auto mt-12 max-w-4xl rounded-2xl border border-border/60 bg-muted/30 p-6 dark:border-border/80 sm:p-8"
            aria-labelledby="resources-internal-links"
          >
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h2
                  id="resources-internal-links"
                  className="text-lg font-bold text-foreground sm:text-xl"
                >
                  {t("internalLinks.title", { appName: APP_NAME })}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t("internalLinks.description")}
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link
                href={getUseCasePath("roommates")}
                className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md dark:border-border/80"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Home className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    {t("internalLinks.roommates.title")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("internalLinks.roommates.description", { appName: APP_NAME })}
                  </p>
                </div>
              </Link>
              <Link
                href={getComparePath("splitwise")}
                className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md dark:border-border/80"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                  <Scale className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    {t("internalLinks.compare.title", { appName: APP_NAME })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("internalLinks.compare.description")}
                  </p>
                </div>
              </Link>
            </div>
          </section>

          <div className={cn("mx-auto mt-10 max-w-3xl p-6 text-center sm:mt-12 sm:p-8", brandStyles.ctaPanel)}>
            <h2 className="text-balance text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("cta.description", { appName: APP_NAME })}
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
