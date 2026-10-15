"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { CircleAlert, CircleCheck, RefreshCw, WifiOff, type LucideIcon } from "lucide-react";

import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LocalGroupBadge } from "@/components/sync/LocalGroupBadge";
import { toast } from "@/hooks/use-toast";
import { useMdUp } from "@/hooks/useDeviceType";
import { useSyncStatus, type SyncStatus } from "@/hooks/useOffline";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { requestPersistentStorage, type LocalGroupRecord } from "@/lib/offline/db";
import { LOCAL_GROUP_REKEYED_EVENT, startLocalGroupSync } from "@/lib/offline/syncLocalGroups";
import { cn } from "@/lib/utils";

/** What the indicator shows: the connection, or a local group that needs a look. */
type IndicatorKind = SyncStatus | "attention";

// Outline icons in the state's colour, drawn a little heavier than usual so
// they stay readable at 16px.
const indicatorIcon: Record<IndicatorKind, { icon: LucideIcon; className: string }> = {
  online: { icon: CircleCheck, className: "text-emerald-600 dark:text-emerald-400" },
  offline: { icon: WifiOff, className: "text-red-600 dark:text-red-400" },
  // Spins for as long as anything is syncing.
  syncing: { icon: RefreshCw, className: "animate-spin text-blue-600 motion-reduce:animate-none dark:text-blue-400" },
  attention: { icon: CircleAlert, className: "text-amber-500 dark:text-amber-400" },
};

/** Offline and syncing come first; "needs attention" only once both are over. */
function useIndicator() {
  const t = useTranslations("offline");
  const sync = useSyncStatus();
  const kind: IndicatorKind = sync.status === "online" && sync.attentionCount > 0 ? "attention" : sync.status;
  const label = {
    offline: t("statusOffline"),
    syncing: t("statusSyncing"),
    online: t("statusOnline"),
    attention: t("statusAttention"),
  }[kind];
  const hint = {
    offline: t("statusOfflineHint"),
    syncing: t("statusSyncingHint"),
    online: t("statusOnlineHint"),
    attention: t("needsAttention", { count: sync.attentionCount }),
  }[kind];
  return { ...sync, kind, label, hint };
}

/**
 * The only screens that show the status (path without the locale): My
 * groups, a group's dashboard, add / edit expense, and create / edit group.
 * Every other page (home, expense details, activity, marketing) never shows it.
 */
const STATUS_PATHS = [
  /^\/groups$/,
  /^\/create-group$/,
  /^\/group\/[^/]+$/,
  /^\/group\/[^/]+\/(add-expense|edit|edit-expense\/[^/]+)$/,
];

function isStatusPath(pathname: string) {
  return STATUS_PATHS.some((pattern) => pattern.test(pathname));
}

/** `className` sizes the icon (default 16px) and can position it. */
function StatusIcon({ kind, className }: { kind: IndicatorKind; className?: string }) {
  const { icon: Icon, className: tone } = indicatorIcon[kind];
  return <Icon className={cn("h-4 w-4 shrink-0", tone, className)} strokeWidth={2.5} aria-hidden />;
}

function hintFor(t: ReturnType<typeof useTranslations>, record: LocalGroupRecord, online: boolean) {
  if (record.state === "rejected") return t("hintRejected", { reason: (record.error ?? "").replace(/[.。।]\s*$/, "") });
  if (record.state === "unknown") return t("hintUnknown");
  if (record.state === "submitting") return t("hintSubmitting");
  return online ? t("hintDraftOnline") : t("hintDraftOffline");
}

function StatusDetails({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations("offline");
  const { kind, label, hint, online, localGroups } = useIndicator();

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <StatusIcon kind={kind} className="mt-0.5 h-5 w-5" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      </div>
      {localGroups.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("localGroupsTitle")}</p>
          <ul className="divide-y divide-border/70 rounded-lg border border-border/70">
            {localGroups.map((record) => (
              <li key={record.id}>
                <Link
                  href={`/group/${record.id}`}
                  onClick={onNavigate}
                  className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{record.group.name}</p>
                    <p className="text-xs text-muted-foreground">{hintFor(t, record, online)}</p>
                  </div>
                  <LocalGroupBadge state={record.state} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The connection status: green check when online with nothing waiting, red
 * wifi-off offline, a blue arrow that spins while anything syncs, and an amber
 * alert when a group created on this device needs a look. A labelled pill on
 * larger screens; on phones, an icon in the screen's own header (see
 * SyncStatusButton), or floating at the top on screens without one. Shown
 * only on the screens isStatusPath lists.
 */
export function SyncStatusIndicator() {
  const t = useTranslations("offline");
  const pathname = usePathname();
  const isMdUp = useMdUp();
  const { kind, label, pendingCount, attentionCount } = useIndicator();
  const [open, setOpen] = useState(false);
  const inlineShown = useSyncExternalStore(subscribeInline, () => inlineCount > 0, () => false);

  if (!isStatusPath(pathname)) return null;

  const ariaLabel =
    attentionCount && kind !== "attention" ? `${label}. ${t("needsAttention", { count: attentionCount })}` : label;

  if (isMdUp) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur hover:bg-muted"
          >
            <StatusIcon kind={kind} />
            <span>{label}</span>
            {pendingCount > 0 ? (
              <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">
                {pendingCount}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-80">
          <StatusDetails onNavigate={() => setOpen(false)} />
        </PopoverContent>
      </Popover>
    );
  }

  // A screen whose header shows the status itself doesn't need the floating one.
  if (inlineShown) return null;

  return (
    <MobileStatusButton className="fixed left-1/2 top-[max(env(safe-area-inset-top,0px),2px)] z-[60] -translate-x-1/2" />
  );
}

/** The phone-sized status icon and the sheet it opens. */
function MobileStatusButton({ className }: { className?: string }) {
  const t = useTranslations("offline");
  const { kind, label, attentionCount } = useIndicator();
  const [open, setOpen] = useState(false);
  const ariaLabel =
    attentionCount && kind !== "attention" ? `${label}. ${t("needsAttention", { count: attentionCount })}` : label;

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen(true)}
        className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", className)}
      >
        <StatusIcon kind={kind} />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="rounded-t-2xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
          <DrawerTitle className="sr-only">{t("sheetTitle")}</DrawerTitle>
          <DrawerDescription className="sr-only">{label}</DrawerDescription>
          <StatusDetails onNavigate={() => setOpen(false)} />
        </DrawerContent>
      </Drawer>
    </>
  );
}

// How many inline status buttons are on screen; while any is, the floating
// mobile one stays hidden.
let inlineCount = 0;
const inlineListeners = new Set<() => void>();
const subscribeInline = (listener: () => void) => {
  inlineListeners.add(listener);
  return () => {
    inlineListeners.delete(listener);
  };
};
const setInlineCount = (delta: number) => {
  inlineCount += delta;
  inlineListeners.forEach((listener) => listener());
};

/**
 * The status icon for a mobile screen's own header, placed next to its menu
 * or actions. Renders nothing at desktop widths, where the pill shows instead,
 * and nothing on screens that don't show the status (see isStatusPath).
 */
export function SyncStatusButton({ className }: { className?: string }) {
  const isMdUp = useMdUp();
  const pathname = usePathname();
  const shown = !isMdUp && isStatusPath(pathname);
  useEffect(() => {
    if (!shown) return;
    setInlineCount(1);
    return () => setInlineCount(-1);
  }, [shown]);
  if (!shown) return null;
  return <MobileStatusButton className={className} />;
}

/**
 * Starts background sync and the app-wide offline notices: one toast when the
 * connection drops, one when a local group couldn't be synced. Also follows a
 * local group that had to be given new ids.
 */
export function SyncProvider() {
  const t = useTranslations("offline");
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const { online, localGroups } = useSyncStatus();

  useEffect(() => {
    startLocalGroupSync();
  }, []);

  useEffect(() => {
    if (localGroups.length) requestPersistentStorage();
  }, [localGroups.length]);

  const wasOnlineRef = useRef(online);
  useEffect(() => {
    if (wasOnlineRef.current && !online && isStatusPath(pathnameRef.current)) {
      toast({ message: t("wentOffline"), variant: "info", duration: 4_000 });
    }
    wasOnlineRef.current = online;
  }, [online, t]);

  const statesRef = useRef(new Map<string, LocalGroupRecord["state"]>());
  useEffect(() => {
    const previous = statesRef.current;
    for (const record of localGroups) {
      if (record.state === "rejected" && previous.get(record.id) && previous.get(record.id) !== "rejected") {
        toast({ message: t("syncFailedToast", { name: record.group.name }), variant: "warning" });
      }
    }
    statesRef.current = new Map(localGroups.map((record) => [record.id, record.state]));
  }, [localGroups, t]);

  useEffect(() => {
    const onRekeyed = (event: Event) => {
      const { from, to } = (event as CustomEvent<{ from: string; to: string }>).detail ?? {};
      if (from && to && pathnameRef.current.includes(`/group/${from}`)) {
        router.replace(pathnameRef.current.replace(`/group/${from}`, `/group/${to}`).replace(/\/(expense|edit-expense)\/.*/, ""));
      }
    };
    window.addEventListener(LOCAL_GROUP_REKEYED_EVENT, onRekeyed);
    return () => window.removeEventListener(LOCAL_GROUP_REKEYED_EVENT, onRekeyed);
  }, [router]);

  return null;
}
