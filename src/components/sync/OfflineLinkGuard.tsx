"use client";

import { useEffect } from "react";

import { isOnline } from "@/lib/offline/network";
import { isSamePage, openOffline } from "@/lib/offline/offlineNavigation";
import { localeOf } from "@/lib/offline/screens";

/**
 * While offline, a tap on a link opens the page without asking the server
 * (openOffline). One listener for the whole app, in the capture phase so it
 * runs before the link's own handler; `Link` doesn't navigate once the default
 * is prevented.
 */
export function OfflineLinkGuard() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isOnline() || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;
      // A link to a section of this same page only scrolls.
      if (isSamePage(url)) return;
      // Another language needs that language's text from the server: Next.js
      // handles it (a page load, which the service worker answers).
      if (localeOf(url.pathname) !== localeOf(window.location.pathname)) return;

      event.preventDefault();
      openOffline(url);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
