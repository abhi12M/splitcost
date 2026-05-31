import "../globals.css";

import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";

import AppProviders from "@/components/providers/AppProviders";
import { defaultLocale } from "@/i18n/routing";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

type PortalLayoutProps = {
  children: ReactNode;
};

/** Admin portal lives outside `[locale]` — provide i18n + app shell here. */
export default async function PortalLayout({ children }: PortalLayoutProps) {
  setRequestLocale(defaultLocale);
  const messages = await getMessages();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={plusJakarta.className}>
        <NextIntlClientProvider locale={defaultLocale} messages={messages}>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
