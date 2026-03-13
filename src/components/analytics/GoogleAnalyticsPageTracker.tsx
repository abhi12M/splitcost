"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { GA_MEASUREMENT_ID } from "@/components/analytics/GoogleAnalytics";
import { ADMIN_PARENT_PATH } from "@/lib/constants";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const isEnabled =
  /^G-[A-Z0-9]+$/i.test(GA_MEASUREMENT_ID) &&
  GA_MEASUREMENT_ID !== "G-XXXXXXXXXX";

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

  useEffect(() => {
    if (
      !isEnabled ||
      !pathname ||
      shouldSkipAnalytics(pathname) ||
      typeof window.gtag !== "function"
    ) {
      return;
    }

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
