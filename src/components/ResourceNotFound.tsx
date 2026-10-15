"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { useOnline } from "@/hooks/useOffline";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

interface ResourceNotFoundProps {
  /** Large numeral shown above the title, e.g. "404" for a route-level not-found page. */
  code?: string;
  /** Heading shown above the message, e.g. a route-level not-found page's title. */
  title?: string;
  message: string;
  actionLabel: string;
  actionHref: string;
}

/** Not-found state — e.g. a bad expense/group id in the URL, or (via `code`/
 * `title`) a route-level 404 — shown with the full site chrome (header/footer
 * on desktop, bottom nav on mobile) via `Layout`. */
export function ResourceNotFound({
  code,
  title,
  message,
  actionLabel,
  actionHref,
}: ResourceNotFoundProps) {
  const tOffline = useTranslations("offline");
  // Offline, a missing page usually just wasn't saved on this device yet;
  // saying "not found" would wrongly suggest it was deleted.
  if (!useOnline()) {
    code = undefined;
    title = tOffline("unavailableTitle");
    message = tOffline("unavailableMessage");
  }
  return (
    <Layout>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        {code && (
          <p className="text-7xl font-bold tracking-tight text-primary/20 sm:text-8xl">
            {code}
          </p>
        )}
        <div className="max-w-md space-y-2">
          {title && (
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
          )}
          <p className="text-muted-foreground">{message}</p>
        </div>
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </div>
    </Layout>
  );
}
