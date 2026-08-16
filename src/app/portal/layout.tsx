import "../globals.css";

import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { plusJakarta } from "@/app/fonts";
import AppProviders from "@/components/providers/AppProviders";
import { defaultLocale } from "@/i18n/routing";

type PortalLayoutProps = {
  children: ReactNode;
};

/** Admin portal lives outside `[locale]` — provide i18n + app shell here. */
export default async function PortalLayout({ children }: PortalLayoutProps) {
  setRequestLocale(defaultLocale);
  const messages = await getMessages();

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} min-h-full font-sans`}>
        <NextIntlClientProvider locale={defaultLocale} messages={messages}>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
