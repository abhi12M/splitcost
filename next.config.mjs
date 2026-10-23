import { execSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Files in public/ the app needs offline: the logos (both themes) and the
// icons. The large marketing images load on demand instead. Listed here
// rather than through Serwist's `globPublicPatterns`, which it ignores once
// `additionalPrecacheEntries` is set. Each revision is the file's hash, so a
// changed file is fetched again.
const OFFLINE_PUBLIC_FILE = /^(favicon.*|android-chrome-.*\.png|apple-touch-icon\.png|logo-.*\.png|placeholder\.svg)$/;
const offlinePublicFiles = readdirSync("public")
  .filter((name) => OFFLINE_PUBLIC_FILE.test(name))
  .map((name) => ({
    url: `/${name}`,
    revision: createHash("md5").update(readFileSync(`public/${name}`)).digest("hex"),
  }));

// Builds public/sw.js from src/app/sw.ts: the app shell, the offline fallback
// page (one per locale) and the files above are precached so the app opens
// offline.
const offlinePageRevision = randomUUID();
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // A reload when the connection returns would throw away unsaved forms; the
  // app refreshes its data itself instead.
  reloadOnOnline: false,
  // Saves each page opened while online, including the first one, which loads
  // before the service worker is in control and so would never be kept. Goes
  // into the same "pages" cache the service worker serves offline pages from.
  cacheOnNavigation: true,
  // The service worker would serve stale code during development.
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    ...offlinePublicFiles,
    ...["en", "es", "pt", "hi"].map((locale) => ({
      url: `/${locale}/offline`,
      revision: offlinePageRevision,
    })),
  ],
});

// When the marketing pages' text last changed: the date of the last commit
// touching it. The sitemap uses it as lastmod, so the date moves only when
// the content does. Empty (no lastmod) when git isn't available.
function getContentLastModified() {
  try {
    return execSync(
      "git log -1 --format=%cI -- messages src/views src/components/landing src/lib/use-cases.ts src/lib/compare.ts src/lib/resources.ts",
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
  } catch {
    return "";
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Realtime runs in the browser. Expose only the public project URL and
  // publishable key; the service-role key remains server-only.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.NEXT_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_SUPABASE_PUBLISHABLE_KEY,
    CONTENT_LAST_MODIFIED: getContentLastModified(),
  },
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  // Tree-shake the heaviest libraries and only ship the icons / functions that
  // are actually imported. Especially impactful for lucide-react and
  // @radix-ui/* which barrel-export huge numbers of components.
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "date-fns",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
      "next-intl",
    ],
  },
  async redirects() {
    const locales = ["en", "es", "pt", "hi"];
    const compareRedirects = [
      { slug: "splitwise", path: "splitwise-alternative" },
      { slug: "splid", path: "splid-alternative" },
      { slug: "tricount", path: "tricount-alternative" },
    ];

    const localeRedirects = locales.flatMap((locale) =>
      compareRedirects.map(({ slug, path }) => ({
        source: `/${locale}/compare/${slug}`,
        destination: `/${locale}/${path}`,
        permanent: true,
      }))
    );

    const rootRedirects = compareRedirects.map(({ slug, path }) => ({
      source: `/compare/${slug}`,
      destination: `/en/${path}`,
      permanent: true,
    }));

    // Blog posts are currently published in English only. Keep the old,
    // unprefixed URLs from competing with their locale-prefixed canonicals in
    // search results by redirecting them before the locale middleware runs.
    const legacyBlogRedirects = [
      {
        source: "/blog",
        destination: "/en/blog",
        permanent: true,
      },
      {
        source: "/blog/:slug*",
        destination: "/en/blog/:slug*",
        permanent: true,
      },
    ];

    // Admin portal lives outside [locale]; next-intl may prefix links with /en/ etc.
    const portalRedirects = locales.map((locale) => ({
      source: `/${locale}/portal/:path*`,
      destination: "/portal/:path*",
      permanent: false,
    }));

    return [...localeRedirects, ...rootRedirects, ...legacyBlogRedirects, ...portalRedirects];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://*.supabase.co wss://*.supabase.co; font-src 'self' data:" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/favicon-:size.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/apple-touch-icon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/og-image.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/placeholder.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Browsers must always check for a new service worker.
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, must-revalidate",
          },
        ],
      },
      {
        source: "/android-chrome-:size.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default withSerwist(withNextIntl(nextConfig));
