import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";
import { buildLocalizedMetadata } from "@/lib/seo-i18n";
import PrivacyPage from "@/views/Privacy";

type PageProps = {
  params: { locale: AppLocale } | Promise<{ locale: AppLocale }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocaleParam(params);
  const t = await getTranslations({ locale, namespace: "metadata.privacy" });

  return buildLocalizedMetadata({
    locale,
    title: t("title"),
    description: t("description"),
    path: "/privacy",
  });
}

export default async function Page({ params }: PageProps) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return <PrivacyPage />;
}
