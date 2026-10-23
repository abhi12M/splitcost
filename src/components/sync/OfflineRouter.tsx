"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useSelectedLayoutSegments } from "next/navigation";

import { OfflineScreen } from "@/components/sync/OfflineShell";
import { useMounted } from "@/hooks/useMounted";
import { usePathname } from "@/i18n/navigation";
import {
  hasMovedInPlace,
  normalizePath,
  setDrawnPagePath,
  subscribeMovedInPlace,
  takePendingSection,
} from "@/lib/offline/offlineNavigation";

/** The path (without locale) of the page Next.js actually rendered. */
function renderedPath(segments: string[]) {
  return `/${segments.filter((segment) => !segment.startsWith("(") && !segment.startsWith("__")).join("/")}`;
}

/**
 * Shows the page the address asks for when it isn't the page Next.js rendered:
 * after moving between pages offline (openOffline), and on the offline
 * fallback page, which the service worker serves at the address of a page it
 * has no copy of. Otherwise renders the page as usual. Moving back to the page
 * Next.js rendered shows it again, from memory.
 */
export function OfflineRouter({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  const pathname = usePathname();
  const rendered = renderedPath(useSelectedLayoutSegments());
  const movedInPlace = useSyncExternalStore(subscribeMovedInPlace, hasMovedInPlace, () => false);

  const active = mounted && (movedInPlace || rendered === "/offline");
  const showsRendered = !active || normalizePath(rendered) === normalizePath(pathname);

  useEffect(() => {
    setDrawnPagePath(rendered);
  }, [rendered]);

  // A move in place to a section of a page (e.g. /#features): scroll to it once
  // the page is on screen.
  useEffect(() => {
    const section = takePendingSection();
    if (section) document.getElementById(section)?.scrollIntoView();
  }, [pathname, showsRendered]);

  if (showsRendered) return <>{children}</>;
  return <OfflineScreen key={pathname} path={normalizePath(pathname)} />;
}
