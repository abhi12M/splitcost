"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useActivityTime } from "@/components/activity/useActivityTime";
import { formatDisplayDateTime } from "@/components/ui/formatters";
import { LocalGroupBadge } from "@/components/sync/LocalGroupBadge";
import { toast } from "@/hooks/use-toast";
import { useMdUp } from "@/hooks/useDeviceType";
import { useSyncStatus, type SyncStatus } from "@/hooks/useOffline";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { requestPersistentStorage, type LocalGroupRecord } from "@/lib/offline/db";
import { getLastSyncedAt, subscribeLastSynced } from "@/lib/offline/network";
import { LOCAL_GROUP_REKEYED_EVENT, startLocalGroupSync } from "@/lib/offline/syncLocalGroups";
import { cn } from "@/lib/utils";

/** What the indicator shows: the connection, or a local group that needs a look. */
type IndicatorKind = SyncStatus | "attention";

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

// The status on every screen size: a small dot. Each state differs in shape
// as well as colour, so it doesn't rely on telling green from red: a solid
// green dot when online, a blinking blue dot while anything syncs, a hollow red
// ring when offline, and an amber dot with a ring around it when a local group
// needs a look.
const indicatorDot: Record<IndicatorKind, string> = {
  online: "bg-emerald-500",
  offline: "border-2 border-red-500 bg-transparent",
  syncing: "animate-pulse bg-blue-500 [animation-duration:800ms] motion-reduce:animate-none",
  attention: "bg-amber-500 ring-2 ring-amber-500/40",
};

/** `className` sizes the dot (default 10px) and can position it. */
function StatusDot({ kind, className }: { kind: IndicatorKind; className?: string }) {
  return <span className={cn("block h-2.5 w-2.5 shrink-0 rounded-full", indicatorDot[kind], className)} aria-hidden />;
}

function hintFor(t: ReturnType<typeof useTranslations>, record: LocalGroupRecord, online: boolean) {
  if (record.state === "rejected") return t("hintRejected", { reason: (record.error ?? "").replace(/[.。।]\s*$/, "") });
  if (record.state === "unknown") return t("hintUnknown");
  if (record.state === "submitting") return t("hintSubmitting");
  return online ? t("hintDraftOnline") : t("hintDraftOffline");
}

/** "Last synced 5 minutes ago": when the server last answered, refreshed while the sheet is open. */
function useLastSyncedText() {
  const t = useTranslations("offline");
  const locale = useLocale();
  const { shortTime } = useActivityTime();
  const at = useSyncExternalStore(subscribeLastSynced, getLastSyncedAt, () => null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), 30_000);
    return () => clearInterval(timer);
  }, []);

  if (!at) return null;
  const age = Date.now() - at;
  const when =
    age < 60_000
      ? shortTime(new Date(at).toISOString()).toLocaleLowerCase(locale)
      : age < 6 * 60 * 60_000
        ? shortTime(new Date(at).toISOString())
        : formatDisplayDateTime(new Date(at));
  return t("lastSynced", { time: when });
}

function StatusDetails({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations("offline");
  const { kind, label, hint, online, localGroups } = useIndicator();
  const lastSynced = useLastSyncedText();

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <StatusDot kind={kind} className="mt-1.5 h-3 w-3" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{hint}</p>
          {lastSynced ? <p className="mt-1 text-xs text-muted-foreground">{lastSynced}</p> : null}
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
 * The connection status, as the same dot everywhere (see indicatorDot): solid
 * green when online with nothing waiting, a blinking blue dot while anything
 * syncs, a hollow red ring offline, and an amber dot with a ring when a group
 * created on this device needs a look. A labelled pill on larger screens; on
 * phones, the dot in the screen's own header (see SyncStatusButton), so nothing
 * shows while a screen is still loading. Shown only on the screens isStatusPath
 * lists.
 */
export function SyncStatusIndicator() {
  const t = useTranslations("offline");
  const pathname = usePathname();
  const isMdUp = useMdUp();
  const { kind, label, pendingCount, attentionCount } = useIndicator();
  const [open, setOpen] = useState(false);

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
            className="fixed bottom-4 left-4 z-40 hidden items-center gap-2 md:inline-flex rounded-full border border-border/80 bg-card/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur hover:bg-muted"
          >
            <StatusDot kind={kind} />
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

  // On phones each screen's own header shows the status (SyncStatusButton).
  return null;
}

/** The phone-sized status dot and the sheet it opens. */
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
        // The ::before widens the tap area to about 44px without moving the dot.
        className={cn(
          "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full before:absolute before:-inset-2.5 before:content-['']",
          className
        )}
      >
        <StatusDot kind={kind} />
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

/**
 * The status dot for a mobile screen's own header, placed right after its
 * heading. Renders nothing at desktop widths, where the pill shows instead,
 * and nothing on screens that don't show the status (see isStatusPath).
 */
export function SyncStatusButton({ className }: { className?: string }) {
  const isMdUp = useMdUp();
  const pathname = usePathname();
  if (isMdUp || !isStatusPath(pathname)) return null;
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
