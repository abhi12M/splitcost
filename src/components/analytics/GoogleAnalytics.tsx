"use client";

import Script from "next/script";
import { useEffect } from "react";

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-7RL974DYTE";

const isEnabled =
  /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID) &&
  GA_MEASUREMENT_ID !== "G-XXXXXXXXXX";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag(...args: unknown[]) {
        window.dataLayer?.push(args);
      };

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
  }, []);

  if (!isEnabled) {
    return null;
  }

  return (
    <Script
      id="ga-gtag"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
    />
  );
}

export { GA_MEASUREMENT_ID };
