import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { RESOURCES_INDEX_PATH } from "@/lib/resources";
import { buildLocalizedMetadata } from "@/lib/seo-i18n";
import ResourcesIndexPage from "@/views/ResourcesIndex";

type PageProps = {
  params: { locale: AppLocale } | Promise<{ locale: AppLocale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: "metadata.resources.index" });

  return buildLocalizedMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: RESOURCES_INDEX_PATH,
  });
}

export default async function Page({ params }: PageProps) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return <ResourcesIndexPage locale={locale} />;
}
