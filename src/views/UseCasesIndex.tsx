import {
  ArrowRight,
  ChevronRight,
  Heart,
  Home,
  Luggage,
  Network,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { brandStyles, landingSection } from "@/lib/brand-styles";
import { APP_NAME } from "@/lib/constants";
import { getLocalizedCanonicalUrl } from "@/lib/seo-i18n";
import { getBreadcrumbId, getWebPageId, getWebsiteId } from "@/lib/schema-identity";
import { serializeStructuredDataForHtml } from "@/lib/blog/schema";
import {
  USE_CASE_INDEX_PATH,
  USE_CASE_LIST,
  getUseCasePath,
  type UseCaseSlug,
} from "@/lib/use-cases";
import { cn } from "@/lib/utils";

const iconBySlug: Record<UseCaseSlug, LucideIcon> = {
  travel: Luggage,
  roommates: Home,
  couples: Heart,
  friends: Users,
  teams: Network,
};

const SPLIT_KEYS = ["equal", "percentage", "custom", "multiplePayers"] as const;
const FAQ_KEYS = ["one", "two", "three"] as const;

type UseCasesIndexPageProps = {
  locale: AppLocale;
};

export default async function UseCasesIndexPage({ locale }: UseCasesIndexPageProps) {
  const t = await getTranslations("useCasePages.index");
  const tItems = await getTranslations("landing.useCases.items");

  const pageUrl = getLocalizedCanonicalUrl(locale, USE_CASE_INDEX_PATH);

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
          name: t("breadcrumbUseCases"),
          item: pageUrl,
        },
      ],
    },
    hasPart: USE_CASE_LIST.map((item) => ({
      "@type": "WebPage",
      "@id": getWebPageId(getLocalizedCanonicalUrl(locale, getUseCasePath(item.slug))),
      name: tItems(`${item.slug}.title`),
      url: getLocalizedCanonicalUrl(locale, getUseCasePath(item.slug)),
    })),
  };

  const faqItems = FAQ_KEYS.map((key) => ({
    question: t(`faq.${key}.question`, { appName: APP_NAME }),
    answer: t(`faq.${key}.answer`, { appName: APP_NAME }),
  }));

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    mainEntity: faqItems.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredDataForHtml(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredDataForHtml(faqJsonLd) }}
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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {USE_CASE_LIST.map((item) => {
              const Icon = iconBySlug[item.slug];

              return (
                <article
                  key={item.slug}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md dark:border-border/80"
                >
                  <div className="relative px-3 pt-3">
                    <div className="relative flex h-40 items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-primary/5 to-primary/10 dark:from-primary-muted/40 dark:to-primary-muted/20">
                      <Image
                        src={item.image}
                        alt={tItems(`${item.slug}.imageAlt`)}
                        width={280}
                        height={180}
                        className="h-[88%] w-auto max-w-full object-contain object-bottom"
                      />
                    </div>
                    <span className="absolute bottom-0 left-1/2 z-10 flex h-11 w-11 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-primary text-white shadow-md ring-4 ring-card">
                      <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col px-5 pb-5 pt-9">
                    <h2 className="mb-2 text-center text-lg font-bold text-foreground">
                      {tItems(`${item.slug}.title`)}
                    </h2>
                    <p className="mb-5 flex-1 text-center text-sm leading-relaxed text-muted-foreground">
                      {t(`cards.${item.slug}.summary`)}
                    </p>
                    <Button asChild variant="outline" className="w-full rounded-xl">
                      <Link href={getUseCasePath(item.slug)}>
                        {t("cardLinkLabel")}
                        <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mx-auto mt-16 max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
              {t("splits.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-center text-sm text-muted-foreground sm:text-base">
              {t("splits.intro", { appName: APP_NAME })}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {SPLIT_KEYS.map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-border/60 bg-card p-5 shadow-sm dark:border-border/80"
                >
                  <h3 className="font-semibold text-foreground">{t(`splits.items.${key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`splits.items.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
              {t("faq.title")}
            </h2>
            <div className="mt-8 divide-y divide-border rounded-2xl border border-border/60 bg-card dark:border-border/80">
              {faqItems.map((faq) => (
                <details key={faq.question} className="group px-5 py-4 sm:px-6">
                  <summary className="cursor-pointer list-none font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start justify-between gap-4">
                      {faq.question}
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>

          <div className={cn("mt-16 p-6 text-center sm:p-8", brandStyles.ctaPanel)}>
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
