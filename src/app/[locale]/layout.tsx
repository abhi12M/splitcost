import "../globals.css";

import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { Suspense, type ReactNode } from "react";

import { GoogleAnalyticsPageTracker } from "@/components/analytics/GoogleAnalyticsPageTracker";
import AppProviders from "@/components/providers/AppProviders";
import { plusJakarta } from "@/app/fonts";
import { serializeStructuredDataForHtml } from "@/lib/blog/schema";
import {
  GA_MEASUREMENT_ID,
  isGoogleAnalyticsEnabled,
} from "@/lib/google-analytics";
import { localeDefinitions } from "@/i18n/config";
import { resolveLocaleParam } from "@/i18n/params";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  DEFAULT_OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  getSiteUrl,
} from "@/lib/seo";
import { getLocalizedCanonicalUrl } from "@/lib/seo-i18n";
import { getOrganizationId, getWebsiteId } from "@/lib/schema-identity";
import { getContactEmail } from "@/lib/contact-email";

const siteUrl = getSiteUrl();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563FF",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: SITE_NAME,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // No default canonical: each page sets its own, so a page without one
  // (such as a 404) never claims to be the home page.
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: siteUrl,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} preview`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "finance",
};

type LocaleLayoutProps = {
  children: ReactNode;
  params: { locale: string } | Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const locale = await resolveLocaleParam(
    params as { locale: AppLocale } | Promise<{ locale: AppLocale }>
  );

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const { htmlLang } = localeDefinitions[locale as AppLocale];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": getWebsiteId(),
      publisher: { "@id": getOrganizationId() },
      name: SITE_NAME,
      url: siteUrl,
      description: SITE_DESCRIPTION,
      inLanguage: htmlLang,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": getOrganizationId(),
      name: SITE_NAME,
      url: siteUrl,
      logo: `${siteUrl}/android-chrome-512x512.png`,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: getContactEmail(),
        url: getLocalizedCanonicalUrl(locale as AppLocale, "/contact"),
      },
    },
  ];

  return (
    <html lang={htmlLang} suppressHydrationWarning>
      <head>
        {isGoogleAnalyticsEnabled() ? (
          <>
            {/* Google tag (gtag.js) */}
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${GA_MEASUREMENT_ID}');
`,
              }}
            />
          </>
        ) : null}
      </head>
      <body className={`${plusJakarta.variable} font-sans`}>
        <NextIntlClientProvider messages={messages}>
          {isGoogleAnalyticsEnabled() ? (
            <Suspense fallback={null}>
              <GoogleAnalyticsPageTracker />
            </Suspense>
          ) : null}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeStructuredDataForHtml(jsonLd) }}
          />
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
