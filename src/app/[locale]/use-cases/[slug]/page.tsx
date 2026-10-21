import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { resolveLocaleParam } from "@/i18n/params";
import { locales, type AppLocale } from "@/i18n/routing";
import { buildLocalizedMetadata } from "@/lib/seo-i18n";
import {
  USE_CASE_SLUGS,
  getUseCasePath,
  isUseCaseSlug,
  type UseCaseSlug,
} from "@/lib/use-cases";
import UseCaseDetailPage from "@/views/UseCaseDetail";

type PageProps = {
  params:
    | { locale: AppLocale; slug: string }
    | Promise<{ locale: AppLocale; slug: string }>;
};

async function resolveParams(params: PageProps["params"]) {
  return params instanceof Promise ? await params : params;
}

// Rebuild hourly so the related blog guides follow published, renamed, or
// removed posts without a redeploy.
export const revalidate = 3600;

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    USE_CASE_SLUGS.map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await resolveParams(params);
  const resolvedLocale = await resolveLocaleParam({ locale });

  if (!isUseCaseSlug(slug)) {
    return {};
  }

  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: `metadata.useCases.${slug}` as `metadata.useCases.${UseCaseSlug}`,
  });

  return buildLocalizedMetadata({
    locale: resolvedLocale,
    title: t("title"),
    description: t("description"),
    path: getUseCasePath(slug),
  });
}

export default async function Page({ params }: PageProps) {
  const { locale, slug } = await resolveParams(params);
  const resolvedLocale = await resolveLocaleParam({ locale });
  setRequestLocale(resolvedLocale);

  if (!isUseCaseSlug(slug)) {
    notFound();
  }

  return <UseCaseDetailPage locale={resolvedLocale} slug={slug} />;
}
