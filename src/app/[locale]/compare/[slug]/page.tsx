import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { resolveLocaleParam } from "@/i18n/params";
import { locales, type AppLocale } from "@/i18n/routing";
import { buildLocalizedMetadata } from "@/lib/seo-i18n";
import {
  COMPARE_ROUTE_SLUGS,
  getComparePath,
  isCompareSlug,
  type CompareSlug,
} from "@/lib/compare";
import CompareDetailPage from "@/views/CompareDetail";

type PageProps = {
  params:
    | { locale: AppLocale; slug: string }
    | Promise<{ locale: AppLocale; slug: string }>;
};

async function resolveParams(params: PageProps["params"]) {
  return params instanceof Promise ? await params : params;
}

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    COMPARE_ROUTE_SLUGS.map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await resolveParams(params);
  const resolvedLocale = await resolveLocaleParam({ locale });

  if (!isCompareSlug(slug)) {
    return {};
  }

  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: `metadata.compare.${slug}` as `metadata.compare.${CompareSlug}`,
  });

  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: t("title"),
    description: t("description"),
    path: getComparePath(slug),
    absoluteTitle: true,
  });
}

export default async function Page({ params }: PageProps) {
  const { locale, slug } = await resolveParams(params);
  const resolvedLocale = await resolveLocaleParam({ locale });
  setRequestLocale(resolvedLocale);

  if (!isCompareSlug(slug)) {
    notFound();
  }

  return <CompareDetailPage locale={resolvedLocale} slug={slug} />;
}
