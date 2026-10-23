"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CloudOff, RefreshCw, TriangleAlert, Smartphone } from "lucide-react";

import { formatDisplayDateTime } from "@/components/ui/formatters";
import type { GroupAccess } from "@/hooks/useOffline";
import { readCachedDashboardSavedAt } from "@/lib/offline/cache";
import { cn } from "@/lib/utils";

/**
 * A thin line under a group screen's header explaining why it can't be
 * changed right now: offline (view only, with when it was last updated), or a
 * group that so far lives only on this device.
 */
export function OfflineBanner({
  groupId,
  access,
  className,
}: {
  groupId: string;
  access: GroupAccess;
  className?: string;
}) {
  const t = useTranslations("offline");
  const { online, local } = access;
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (online || local) return;
    let active = true;
    void readCachedDashboardSavedAt(groupId).then((value) => {
      if (active) setSavedAt(value);
    });
    return () => {
      active = false;
    };
  }, [groupId, online, local]);

  let icon = CloudOff;
  let text: string | null = null;
  let tone = "border-border/70 bg-muted/60 text-muted-foreground";

  if (local) {
    if (local.state === "rejected") {
      icon = TriangleAlert;
      text = t("bannerRejected", { reason: (local.error ?? "").replace(/[.。।]\s*$/, "") });
      tone = "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300";
    } else if (local.state === "unknown") {
      icon = TriangleAlert;
      text = t("bannerUnknown");
      tone = "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300";
    } else if (local.state === "submitting") {
      icon = RefreshCw;
      text = t("bannerSubmitting");
      tone = "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300";
    } else {
      icon = Smartphone;
      text = online ? t("bannerLocalOnline") : t("bannerLocalOffline");
    }
  } else if (!online) {
    text = savedAt
      ? t("bannerViewOnlyUpdated", { time: formatDisplayDateTime(new Date(savedAt)) })
      : t("bannerViewOnly");
  }

  if (!text) return null;
  const Icon = icon;

  return (
    <div
      role="status"
      className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium leading-snug", tone, className)}
    >
      <Icon
        className={cn("mt-px h-3.5 w-3.5 shrink-0", local?.state === "submitting" && "animate-spin motion-reduce:animate-none")}
        aria-hidden
      />
      <span className="min-w-0">{text}</span>
    </div>
  );
}
