/// <reference lib="webworker" />
// The service worker: lets the app open and move between screens offline.
// Data never goes through here; screens keep their own copy in IndexedDB.

import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const LOCALES = ["en", "es", "pt", "hi"] as const;
const DAY = 24 * 60 * 60;

// Only same-origin requests are handled. Anything else (analytics, Supabase)
// goes to the network exactly as without a service worker.
const runtimeCaching: RuntimeCaching[] = [
  // API answers are never served from a cache: the app must see a real
  // network failure to know it is offline, and keeps its own data copy.
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/_next/static/"),
    handler: new CacheFirst({
      cacheName: "next-static",
      plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * DAY })],
    }),
  },
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && /\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf)$/i.test(url.pathname),
    handler: new StaleWhileRevalidate({
      cacheName: "static-assets",
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 30 * DAY })],
    }),
  },
  // Images resized by Next.js (`/_next/image?url=…`): their URL has no file
  // extension, so the rule above misses them. Any image seen once then shows
  // offline too. Large marketing images are not precached on purpose.
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname === "/_next/image",
    handler: new StaleWhileRevalidate({
      cacheName: "next-images",
      plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * DAY })],
    }),
  },
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname === "/manifest.webmanifest",
    handler: new StaleWhileRevalidate({ cacheName: "static-assets" }),
  },
  // Screen data for client-side navigation, so screens opened before can be
  // moved between offline.
  {
    matcher: ({ sameOrigin, request }) => sameOrigin && request.headers.get("RSC") === "1",
    handler: new NetworkFirst({
      cacheName: "pages-rsc",
      networkTimeoutSeconds: 5,
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * DAY })],
    }),
  },
  {
    matcher: ({ sameOrigin, request }) => sameOrigin && request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: "pages",
      networkTimeoutSeconds: 5,
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * DAY })],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    // A page with no saved copy gets the offline shell in its own language,
    // which renders the screen the URL asks for from the device's data.
    entries: [
      ...LOCALES.map((locale) => ({
        url: `/${locale}/offline`,
        matcher: ({ request }: { request: Request }) => {
          const { pathname } = new URL(request.url);
          return request.destination === "document" && (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
        },
      })),
      {
        url: "/en/offline",
        matcher: ({ request }: { request: Request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
