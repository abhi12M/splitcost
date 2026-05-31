import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { resolveLocaleParam } from "@/i18n/params";
import { locales, type AppLocale } from "@/i18n/routing";
import { buildLocalizedMetadata } from "@/lib/seo-i18n";
import { getComparePath } from "@/lib/compare";
import CompareDetailPage from "@/views/CompareDetail";

type PageProps = {
  params: { locale: AppLocale } | Promise<{ locale: AppLocale }>;
};

async function resolveParams(params: PageProps["params"]) {
  return params instanceof Promise ? await params : params;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await resolveParams(params);
  const resolvedLocale = await resolveLocaleParam({ locale });

  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: "metadata.compare.splitwise",
  });

  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: t("title"),
    description: t("description"),
    path: getComparePath("splitwise"),
    absoluteTitle: true,
  });
}

export default async function Page({ params }: PageProps) {
  const { locale } = await resolveParams(params);
  const resolvedLocale = await resolveLocaleParam({ locale });
  setRequestLocale(resolvedLocale);

  return <CompareDetailPage locale={resolvedLocale} slug="splitwise" />;
}
