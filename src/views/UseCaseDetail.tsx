import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Heart,
  Home,
  Luggage,
  Network,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { brandStyles, brandUseCaseAccent, landingSection } from "@/lib/brand-styles";
import { APP_NAME } from "@/lib/constants";
import { getLocalizedCanonicalUrl } from "@/lib/seo-i18n";
import { RESOURCES_INDEX_PATH } from "@/lib/resources";
import {
  USE_CASE_INDEX_PATH,
  USE_CASE_LIST,
  getUseCasePath,
  type UseCaseAccent,
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

const accentStyles: Record<
  UseCaseAccent,
  {
    iconBg: string;
    sceneBg: string;
    checkColor: string;
  }
> = {
  brand: {
    iconBg: brandUseCaseAccent.iconBg,
    sceneBg: brandUseCaseAccent.sceneBg,
    checkColor: "text-primary dark:text-primary/90",
  },
  emerald: {
    iconBg: "bg-emerald-600",
    sceneBg: "from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/30 dark:to-teal-950/20",
    checkColor: "text-emerald-600 dark:text-emerald-400",
  },
  rose: {
    iconBg: "bg-rose-500",
    sceneBg: "from-rose-50/80 to-pink-50/80 dark:from-rose-950/30 dark:to-pink-950/20",
    checkColor: "text-rose-600 dark:text-rose-400",
  },
  cyan: {
    iconBg: "bg-cyan-600",
    sceneBg: "from-cyan-50/80 to-slate-50/80 dark:from-cyan-950/30 dark:to-slate-950/20",
    checkColor: "text-cyan-600 dark:text-cyan-300",
  },
};

const PAIN_POINT_KEYS = ["one", "two", "three"] as const;
const STEP_KEYS = ["one", "two", "three", "four"] as const;
const BENEFIT_KEYS = ["one", "two", "three", "four"] as const;
const FAQ_KEYS = ["one", "two", "three"] as const;

type UseCaseDetailPageProps = {
  locale: AppLocale;
  slug: UseCaseSlug;
};

export default async function UseCaseDetailPage({ locale, slug }: UseCaseDetailPageProps) {
  const meta = USE_CASE_LIST.find((item) => item.slug === slug)!;
  const styles = accentStyles[meta.accent];
  const Icon = iconBySlug[slug];

  const t = await getTranslations(`useCasePages.${slug}`);
  const tShared = await getTranslations("useCasePages.shared");
  const tItems = await getTranslations("landing.useCases.items");

  const pagePath = getUseCasePath(slug);
  const pageUrl = getLocalizedCanonicalUrl(locale, pagePath);

  const faqItems = FAQ_KEYS.map((key) => ({
    question: t(`faq.${key}.question`, { appName: APP_NAME }),
    answer: t(`faq.${key}.answer`, { appName: APP_NAME }),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
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
              name: tShared("breadcrumbHome"),
              item: getLocalizedCanonicalUrl(locale, "/"),
            },
            {
              "@type": "ListItem",
              position: 2,
              name: tShared("breadcrumbUseCases"),
              item: getLocalizedCanonicalUrl(locale, USE_CASE_INDEX_PATH),
            },
            {
              "@type": "ListItem",
              position: 3,
              name: tItems(`${slug}.title`),
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

  const relatedSlugs = USE_CASE_LIST.filter((item) => item.slug !== slug);

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        <section className={cn(landingSection.default, "pb-10 pt-10 sm:pb-16 sm:pt-16 md:pb-20 md:pt-20")}>
          <div className="container">
            <nav aria-label={tShared("breadcrumbLabel")} className="mb-8">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-foreground transition-colors">
                    {tShared("breadcrumbHome")}
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <li>
                  <Link href={USE_CASE_INDEX_PATH} className="hover:text-foreground transition-colors">
                    {tShared("breadcrumbUseCases")}
                  </Link>
                </li>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <li className="font-medium text-foreground" aria-current="page">
                  {tItems(`${slug}.title`)}
                </li>
              </ol>
            </nav>

            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <div>
                <p className={cn("mb-5", brandStyles.sectionBadge)}>
                  {tItems(`${slug}.title`)}
                </p>
                <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-tight">
                  {t("hero.title")}
                </h1>
                <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {t("hero.subtitle", { appName: APP_NAME })}
                </p>
                <Button asChild size="lg" className="mt-8 h-11 rounded-xl px-6 text-sm font-semibold sm:h-12 sm:text-base">
                  <Link href="/create-group">
                    {t("hero.cta")}
                    <ArrowRight className="ml-1 h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                  </Link>
                </Button>
              </div>

              <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                <div
                  className={cn(
                    "relative flex aspect-[4/3] items-end justify-center overflow-hidden rounded-2xl bg-gradient-to-b",
                    styles.sceneBg
                  )}
                >
                  <Image
                    src={meta.image}
                    alt={tItems(`${slug}.imageAlt`)}
                    width={480}
                    height={360}
                    priority
                    className="h-[85%] w-auto max-w-[90%] object-contain object-bottom"
                  />
                </div>
                <span
                  className={cn(
                    "absolute bottom-0 left-1/2 flex h-14 w-14 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-background",
                    styles.iconBg
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.25} aria-hidden />
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className={cn(landingSection.alternate, landingSection.padding)}>
          <div className="container max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
              {t("painPoints.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
              {t("painPoints.description")}
            </p>
            <ul className="mt-8 space-y-4">
              {PAIN_POINT_KEYS.map((key) => (
                <li
                  key={key}
                  className="flex gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-sm dark:border-border/80"
                >
                  <CheckCircle2 className={cn("mt-0.5 h-5 w-5 shrink-0", styles.checkColor)} aria-hidden />
                  <div>
                    <h3 className="font-semibold text-foreground">{t(`painPoints.${key}.title`)}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {t(`painPoints.${key}.description`)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={cn(landingSection.default, landingSection.padding)}>
          <div className="container max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
              {tShared("howItWorksTitle", { appName: APP_NAME })}
            </h2>
            <ol className="mt-8 space-y-6">
              {STEP_KEYS.map((key, index) => (
                <li key={key} className="flex gap-4">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                      styles.iconBg
                    )}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">{t(`steps.${key}.title`)}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {t(`steps.${key}.description`, { appName: APP_NAME })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className={cn(landingSection.alternate, landingSection.padding)}>
          <div className="container max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
              {tShared("benefitsTitle", { appName: APP_NAME })}
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {BENEFIT_KEYS.map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-border/60 bg-card p-5 shadow-sm dark:border-border/80"
                >
                  <h3 className="font-semibold text-foreground">{t(`benefits.${key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`benefits.${key}.description`, { appName: APP_NAME })}
                  </p>
                </div>
              ))}
            </div>
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
            <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
              {relatedSlugs.map((item) => {
                const RelatedIcon = iconBySlug[item.slug];

                return (
                  <Link
                    key={item.slug}
                    href={getUseCasePath(item.slug)}
                    className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-shadow hover:shadow-md dark:border-border/80"
                  >
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white", accentStyles[item.accent].iconBg)}>
                      <RelatedIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{tItems(`${item.slug}.title`)}</p>
                      <p className="text-sm text-muted-foreground">{tItems(`${item.slug}.description`)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {slug === "roommates" ? (
          <section className={cn(landingSection.default, landingSection.padding)}>
            <div className="container max-w-3xl">
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 dark:border-border/80 sm:p-8">
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <h2 className="text-lg font-bold text-foreground sm:text-xl">
                      {tShared("furtherReadingTitle")}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {tShared("furtherReadingDescription")}
                    </p>
                    <Button asChild variant="outline" className="mt-4 rounded-xl">
                      <Link href={RESOURCES_INDEX_PATH}>
                        {tShared("furtherReadingLinkLabel")}
                        <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className={cn(landingSection.default, "pb-16 pt-4 sm:pb-20 md:pb-24")}>
          <div className="container">
            <div className={cn("p-6 text-center sm:p-8", brandStyles.ctaPanel)}>
              <h2 className="text-balance text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                {tShared("cta.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t("cta.description", { appName: APP_NAME })}
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
