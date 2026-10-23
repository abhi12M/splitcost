import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { OfflineShell } from "@/components/sync/OfflineShell";
import { resolveLocaleParam } from "@/i18n/params";
import type { AppLocale } from "@/i18n/routing";

type PageProps = {
  params: { locale: AppLocale } | Promise<{ locale: AppLocale }>;
};

export const metadata: Metadata = {
  title: "SplitCost",
  robots: { index: false, follow: false },
};

// The service worker precaches this page (one per locale) and serves it for
// any page it has no saved copy of while offline.
export default async function OfflinePage({ params }: PageProps) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  return <OfflineShell />;
}
