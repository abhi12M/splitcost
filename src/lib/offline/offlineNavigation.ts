// Moving between pages while offline. Next.js would ask the server for the
// next page, fail, and fall back to a full page load that lands on the offline
// page. Instead the address changes in place and OfflineRouter draws the page
// from this device: an app screen from its data, any other page as the
// "You're offline" message. The page Next.js drew (the one last loaded) is
// still in memory, so it shows again in place too. Any other page saved on
// this device opens with a normal page load, since that is the only way to
// show it.

import { BACK_CLOSE_KEY } from "@/lib/historyKeys";

import { appScreenFor, withoutLocale } from "./screens";

type Listener = () => void;

let movedInPlace = false;
let pendingHref: string | null = null;
// Set by OfflineRouter: the path (without locale) of the page Next.js drew.
let drawnPagePath: string | null = null;
// The section to scroll to once the page that holds it is on screen.
let pendingSection: string | null = null;
const listeners = new Set<Listener>();

/** Whether a page has been opened in place since this page load. */
export function hasMovedInPlace() {
  return movedInPlace;
}

export function subscribeMovedInPlace(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function withoutTrailingSlash(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** A path in one form for comparing: decoded, without a trailing slash. */
export function normalizePath(path: string) {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // Keep it as it is.
  }
  return withoutTrailingSlash(decoded);
}

export function setDrawnPagePath(path: string) {
  drawnPagePath = normalizePath(path);
}

/** The section a move in place asked for, once; null when there is none. */
export function takePendingSection() {
  const section = pendingSection;
  pendingSection = null;
  return section;
}

/**
 * Whether `url` is the page already open (perhaps a section of it), which
 * needs no server: Next.js only scrolls. `/en/` and `/en` are the same page.
 */
export function isSamePage(url: URL) {
  return (
    withoutTrailingSlash(url.pathname) === withoutTrailingSlash(window.location.pathname) &&
    url.search === window.location.search
  );
}

/** Whether the service worker has a saved copy of this page to open offline. */
async function isPageSaved(url: URL) {
  if (typeof caches === "undefined") return false;
  try {
    return Boolean(await caches.match(url.href, { cacheName: "pages" }));
  } catch {
    return false;
  }
}

function showInPlace(href: string, hash: string, replace: boolean) {
  pendingSection = hash ? hash.slice(1) : null;
  if (!movedInPlace) {
    movedInPlace = true;
    listeners.forEach((listener) => listener());
  }
  // Next.js picks up the new address (usePathname, Back and Forward) without
  // fetching anything.
  if (replace) window.history.replaceState(null, "", href);
  else window.history.pushState(null, "", href);
  if (!pendingSection) window.scrollTo(0, 0);
}

/**
 * Opens the page at `url` while offline. Called for the same move by both a
 * link and its own click handler (the mobile menu does this), so a move to
 * the page already open, or already on its way, does nothing.
 */
export function openOffline(url: URL, { replace = false }: { replace?: boolean } = {}) {
  const target = new URL(url.href);
  target.pathname = withoutTrailingSlash(target.pathname);
  const href = target.pathname + target.search + target.hash;
  const here = window.location.pathname + window.location.search + window.location.hash;
  if (href === here || href === pendingHref) return;
  // Leaving from an open sheet or dialog: take the place of the history entry
  // it added, so Back doesn't stop at the closed sheet first.
  const fromOverlay = Boolean(window.history.state?.[BACK_CLOSE_KEY]);
  const replaceEntry = replace || fromOverlay;

  const path = withoutLocale(target.pathname);
  if (appScreenFor(path) || normalizePath(path) === drawnPagePath) {
    showInPlace(href, target.hash, replaceEntry);
    return;
  }

  pendingHref = href;
  void isPageSaved(target).then((saved) => {
    pendingHref = null;
    if (!saved) showInPlace(href, target.hash, replaceEntry);
    else if (replaceEntry) window.location.replace(target.href);
    else window.location.assign(target.href);
  });
}
