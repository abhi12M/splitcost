import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { buildLocalizedMetadata } from "@/lib/seo-i18n";
import NotFound from "@/views/NotFound";

type Props = {
  params: { locale: AppLocale } | Promise<{ locale: AppLocale }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: "metadata.notFound" });

  return buildLocalizedMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/404",
    noIndex: true,
  });
}

export default async function NotFoundPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return <NotFound />;
}
