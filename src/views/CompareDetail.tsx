import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Scale,
  X,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CompareMobileDashboardPreview } from "@/components/landing/CompareMobileDashboardPreview";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { brandStyles, landingSection } from "@/lib/brand-styles";
import { APP_NAME } from "@/lib/constants";
import {
  COMPARE_FAQ_KEYS,
  COMPARE_INDEX_PATH,
  COMPARE_LIST,
  COMPARE_REASON_KEYS,
  COMPARE_WHO_ITEM_KEYS,
  COMPARE_WHO_SHOW_MOBILE_PREVIEW,
  COMPARISON_ROW_KEYS,
  getCompareMeta,
  getComparePath,
  type CompareSlug,
} from "@/lib/compare";
import { getLocalizedCanonicalUrl } from "@/lib/seo-i18n";
import { cn } from "@/lib/utils";

type CompareDetailPageProps = {
  locale: AppLocale;
  slug: CompareSlug;
};

function CellValue({ value, yesLabel, noLabel }: { value: string; yesLabel: string; noLabel: string }) {
  if (value === "yes") {
    return (
      <span className="inline-flex items-center justify-center text-success">
        <Check className="h-4 w-4 shrink-0" aria-hidden />
        <span className="sr-only">{yesLabel}</span>
      </span>
    );
  }

  if (value === "no") {
    return (
      <span className="inline-flex items-center justify-center text-muted-foreground">
        <X className="h-4 w-4 shrink-0" aria-hidden />
        <span className="sr-only">{noLabel}</span>
      </span>
    );
  }

  return (
    <span className="inline-block max-w-full break-words text-xs leading-snug text-muted-foreground sm:text-sm">
      {value}
    </span>
  );
}

export default async function CompareDetailPage({ locale, slug }: CompareDetailPageProps) {
  const meta = getCompareMeta(slug);
  const competitor = meta.competitorName;
  const translationValues = { appName: APP_NAME, competitor };

  const t = await getTranslations(`comparePages.${slug}`);
  const tShared = await getTranslations("comparePages.shared");
  const tTable = await getTranslations("comparePages.comparisonTable");

  const pagePath = getComparePath(slug);
  const pageUrl = getLocalizedCanonicalUrl(locale, pagePath);

  const reasonKeys = COMPARE_REASON_KEYS[slug];
  const faqKeys = COMPARE_FAQ_KEYS[slug];
  const showWhoMobilePreview = COMPARE_WHO_SHOW_MOBILE_PREVIEW.includes(slug);
  const hasWhoShouldSection = showWhoMobilePreview;
  const faqItems = faqKeys.map((key) => ({
    question: t(`faq.${key}.question`, translationValues),
    answer: t(`faq.${key}.answer`, translationValues),
  }));

  const trustLine = t.has("hero.trustLine")
    ? t("hero.trustLine")
        .split("•")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: t("jsonLdName", translationValues),
        description: t("jsonLdDescription", translationValues),
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
              name: tShared("breadcrumbHome"),
              item: getLocalizedCanonicalUrl(locale, "/"),
            },
            {
              "@type": "ListItem",
              position: 2,
              name: tShared("breadcrumbCompare"),
              item: getLocalizedCanonicalUrl(locale, COMPARE_INDEX_PATH),
            },
            {
              "@type": "ListItem",
              position: 3,
              name: t("breadcrumbPage", translationValues),
              item: pageUrl,
            },
          ],
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  const relatedSlugs = COMPARE_LIST.filter((item) => item.slug !== slug);

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="overflow-x-clip">
        <section className={cn(landingSection.default, "pb-10 pt-10 sm:pb-16 sm:pt-16 md:pb-20 md:pt-20")}>
          <div className="container">
            <nav aria-label={tShared("breadcrumbLabel")} className="mb-8">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <li>
                  <Link href="/" className="transition-colors hover:text-foreground">
                    {tShared("breadcrumbHome")}
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <li>
                  <Link href={COMPARE_INDEX_PATH} className="transition-colors hover:text-foreground">
                    {tShared("breadcrumbCompare")}
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <li className="font-medium text-foreground" aria-current="page">
                  {t("breadcrumbPage", translationValues)}
                </li>
              </ol>
            </nav>

            <div className="mx-auto max-w-3xl text-center">
              <p className={cn("mb-5 uppercase tracking-wide", brandStyles.sectionBadge)}>
                <Scale className="h-3.5 w-3.5" aria-hidden />
                {t("badge", translationValues)}
              </p>
              <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-tight">
                {t("hero.title", translationValues)}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("hero.subtitle", translationValues)}
              </p>
              <Button asChild size="lg" className="mt-8 h-11 rounded-xl px-6 text-sm font-semibold sm:h-12 sm:text-base">
                <Link href="/create-group">
                  {t("hero.cta", translationValues)}
                  <ArrowRight className="ml-1 h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                </Link>
              </Button>
              {trustLine.length > 0 ? (
                <ul className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {trustLine.map((item) => (
                    <li key={item} className="inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>

        <section className={cn(landingSection.alternate, landingSection.padding)}>
          <div className="container min-w-0 max-w-4xl">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
              {t.has("comparisonTitle")
                ? t("comparisonTitle", translationValues)
                : tShared("comparisonTitle", translationValues)}
            </h2>

            <div className="mt-8 w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-border/60 bg-card shadow-sm [-webkit-overflow-scrolling:touch] dark:border-border/80">
              <table className="w-full min-w-0 table-fixed border-collapse text-left sm:min-w-[32rem] sm:table-auto">
                <caption className="sr-only">
                  {tShared("comparisonCaption", translationValues)}
                </caption>
                <colgroup>
                  <col className="w-[44%] sm:w-auto" />
                  <col className="w-[28%] sm:w-auto" />
                  <col className="w-[28%] sm:w-auto" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40">
                    <th scope="col" className="px-2.5 py-3 text-xs font-semibold text-foreground sm:px-6 sm:text-sm">
                      {tTable("featureColumn")}
                    </th>
                    <th scope="col" className="px-2.5 py-3 text-center text-xs font-semibold text-primary sm:px-6 sm:text-sm">
                      {APP_NAME}
                    </th>
                    <th scope="col" className="px-2.5 py-3 text-center text-xs font-semibold text-foreground sm:px-6 sm:text-sm">
                      {competitor}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROW_KEYS.map((rowKey) => {
                    const splitcostValue = tTable(`rows.${rowKey}.splitcost`);
                    const competitorValue = tTable(`rows.${rowKey}.competitor.${slug}`);

                    return (
                      <tr key={rowKey} className="border-b border-border/40 last:border-0">
                        <th
                          scope="row"
                          className="px-2.5 py-3 text-xs font-medium leading-snug text-foreground sm:px-6 sm:py-3.5 sm:text-sm"
                        >
                          <span className="break-words">{tTable(`rows.${rowKey}.feature`)}</span>
                        </th>
                        <td className="px-2.5 py-3 text-center align-middle sm:px-6 sm:py-3.5">
                          <CellValue value={splitcostValue} yesLabel={tShared("comparisonYes")} noLabel={tShared("comparisonNo")} />
                        </td>
                        <td className="px-2.5 py-3 text-center align-middle sm:px-6 sm:py-3.5">
                          <CellValue value={competitorValue} yesLabel={tShared("comparisonYes")} noLabel={tShared("comparisonNo")} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className={cn(landingSection.default, landingSection.padding)}>
          <div className="container max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
              {t("reasons.title", translationValues)}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
              {t("reasons.description", translationValues)}
            </p>
            <ul className="mt-8 space-y-4">
              {reasonKeys.map((key) => (
                <li
                  key={key}
                  className="rounded-xl border border-border/60 bg-card p-5 shadow-sm dark:border-border/80"
                >
                  <h3 className="font-semibold text-foreground">
                    {t(`reasons.${key}.title`, translationValues)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`reasons.${key}.description`, translationValues)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={cn(landingSection.alternate, landingSection.padding)}>
          <div className="container max-w-5xl">
            {hasWhoShouldSection ? (
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <div>
                  <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                    {t("whoShould.title", translationValues)}
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {t("whoShould.intro", translationValues)}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {COMPARE_WHO_ITEM_KEYS[slug].map((key) => (
                      <li key={key} className="flex items-start gap-2.5 text-sm sm:text-base">
                        <CheckCircle2
                          className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                          aria-hidden
                        />
                        <span className="leading-relaxed text-foreground">
                          {t(`whoShould.items.${key}`, translationValues)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {t.has("whoShould.closing") ? (
                    <p className="mt-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {t("whoShould.closing", translationValues)}
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-center lg:justify-end">
                  <CompareMobileDashboardPreview
                    className="lg:translate-x-2"
                    aria-label={t("whoShould.mobilePreviewAlt", translationValues)}
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
                  {tShared("whoShouldSwitchTitle", translationValues)}
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t("whoShouldSwitch", translationValues)}
                </p>
              </>
            )}
          </div>
        </section>

        <section className={cn(landingSection.default, landingSection.padding)}>
          <div className="container max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
              {tShared("faqTitle")}
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
        </section>

        <section className={cn(landingSection.alternate, landingSection.padding)}>
          <div className="container">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
              {tShared("relatedTitle")}
            </h2>
            <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
              {relatedSlugs.map((item) => (
                <Link
                  key={item.slug}
                  href={getComparePath(item.slug)}
                  className="rounded-xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md dark:border-border/80"
                >
                  <p className="font-semibold text-foreground">
                    {tShared(`related.${item.slug}.title`, {
                      appName: APP_NAME,
                      competitor: item.competitorName,
                    })}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tShared(`related.${item.slug}.summary`, {
                      appName: APP_NAME,
                      competitor: item.competitorName,
                    })}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={cn(landingSection.default, "pb-16 pt-4 sm:pb-20 md:pb-24")}>
          <div className="container">
            <div className={cn("mx-auto max-w-3xl p-6 text-center sm:p-8", brandStyles.ctaPanel)}>
              <h2 className="text-balance text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                {tShared("cta.title", translationValues)}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t("cta.description", translationValues)}
              </p>
              <Button asChild size="lg" className="mt-6 h-11 rounded-xl px-6 text-sm font-semibold sm:h-12 sm:text-base">
                <Link href="/create-group">
                  {tShared("cta.button")}
                  <ArrowRight className="ml-1 h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </article>
    </Layout>
  );
}
