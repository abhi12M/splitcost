"use client";

import { useTranslations } from "next-intl";

import type { LocalSyncState } from "@/lib/offline/db";
import { cn } from "@/lib/utils";

const tone: Record<LocalSyncState, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  submitting: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  unknown: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  rejected: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

const labelKey: Record<LocalSyncState, string> = {
  draft: "badgeDraft",
  submitting: "badgeSubmitting",
  unknown: "badgeUnknown",
  rejected: "badgeRejected",
};

/** "Not synced" and friends: where a group created on this device is in reaching the server. */
export function LocalGroupBadge({ state, className }: { state: LocalSyncState; className?: string }) {
  const t = useTranslations("offline");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none",
        tone[state],
        className
      )}
    >
      {t(labelKey[state])}
    </span>
  );
}
