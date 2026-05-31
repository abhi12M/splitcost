"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { usePathname } from "@/i18n/navigation";
import { ADMIN_PARENT_PATH } from "@/lib/constants";
import {
  GA_MEASUREMENT_ID,
  isGoogleAnalyticsEnabled,
} from "@/lib/google-analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function shouldSkipAnalytics(pathname: string): boolean {
  return (
    pathname === ADMIN_PARENT_PATH ||
    pathname.startsWith(`${ADMIN_PARENT_PATH}/`) ||
    pathname.startsWith("/group/")
  );
}

export function GoogleAnalyticsPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTrackedInitialPageView = useRef(false);

  useEffect(() => {
    if (
      !isGoogleAnalyticsEnabled() ||
      !pathname ||
      shouldSkipAnalytics(pathname)
    ) {
      return;
    }

    if (!hasTrackedInitialPageView.current) {
      hasTrackedInitialPageView.current = true;
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag(...args: unknown[]) {
        window.dataLayer?.push(args);
      };

    const query = searchParams?.toString() ?? "";
    const pagePath = query ? `${pathname}?${query}` : pathname;

    window.gtag("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: pagePath,
      send_to: GA_MEASUREMENT_ID,
    });
  }, [pathname, searchParams]);

  return null;
}
