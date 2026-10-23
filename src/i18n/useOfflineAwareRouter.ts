"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { createNavigation } from "next-intl/navigation";

import { isOnline } from "@/lib/offline/network";
import { isSamePage, openOffline } from "@/lib/offline/offlineNavigation";

import { routing } from "./routing";

const { useRouter: useIntlRouter, getPathname } = createNavigation(routing);

type IntlRouter = ReturnType<typeof useIntlRouter>;
type Href = Parameters<IntlRouter["push"]>[0];
type NavigateOptions = Parameters<IntlRouter["push"]>[1];

/**
 * next-intl's router, except that while offline `push` and `replace` open the
 * page without asking the server (openOffline), as links do. Switching
 * language still goes through Next.js, which needs that language's text.
 */
export function useOfflineAwareRouter(): IntlRouter {
  const router = useIntlRouter();
  const locale = useLocale();

  return useMemo(() => {
    const offlineUrl = (href: Href, options: NavigateOptions) => {
      if (isOnline() || (options?.locale && options.locale !== locale)) return null;
      const url = new URL(getPathname({ href, locale }), window.location.href);
      // A section of this same page: Next.js only scrolls, no server needed.
      return isSamePage(url) ? null : url;
    };
    return {
      ...router,
      push: (href, options) => {
        const url = offlineUrl(href, options);
        if (url) openOffline(url);
        else router.push(href, options);
      },
      replace: (href, options) => {
        const url = offlineUrl(href, options);
        if (url) openOffline(url, { replace: true });
        else router.replace(href, options);
      },
    };
  }, [router, locale]);
}
