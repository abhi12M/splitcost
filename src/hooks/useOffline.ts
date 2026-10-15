"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { liveQuery } from "dexie";
import { useTranslations } from "next-intl";

import { toast } from "@/hooks/use-toast";
import { getOfflineDb, type LocalGroupRecord } from "@/lib/offline/db";
import { isLocalGroupEditable } from "@/lib/offline/localGroups";
import { isOfflineError, isOnline, subscribeOnline } from "@/lib/offline/network";
import { isSyncActive, subscribeSyncActivity } from "@/lib/offline/syncActivity";

/** Whether the app can reach its server. Renders as online on the server. */
export function useOnline() {
  return useSyncExternalStore(subscribeOnline, isOnline, () => true);
}

function useSyncActive() {
  return useSyncExternalStore(subscribeSyncActivity, isSyncActive, () => false);
}

/** Every group created on this device that hasn't reached the server, kept live across tabs. */
export function useLocalGroups(): LocalGroupRecord[] {
  const [groups, setGroups] = useState<LocalGroupRecord[]>([]);
  useEffect(() => {
    const db = getOfflineDb();
    if (!db) return;
    const subscription = liveQuery(() => db.localGroups.toArray()).subscribe({
      next: setGroups,
      error: (error) => console.error("local groups watch failed:", error),
    });
    return () => subscription.unsubscribe();
  }, []);
  return groups;
}

/**
 * This group's local record; null when the group is on the server, undefined
 * while that is still being looked up (a few milliseconds after mounting).
 */
export function useLocalGroup(groupId: string): LocalGroupRecord | null | undefined {
  const [record, setRecord] = useState<LocalGroupRecord | null | undefined>(undefined);
  useEffect(() => {
    const db = getOfflineDb();
    setRecord(db && groupId ? undefined : null);
    if (!db || !groupId) return;
    const subscription = liveQuery(() => db.localGroups.get(groupId)).subscribe({
      next: (value) => setRecord(value ?? null),
      error: (error) => console.error("local group watch failed:", error),
    });
    return () => subscription.unsubscribe();
  }, [groupId]);
  return record;
}

export type SyncStatus = "offline" | "syncing" | "online";

/** What the status dot shows, plus how many local groups wait or need a look. */
export function useSyncStatus() {
  const online = useOnline();
  const active = useSyncActive();
  const localGroups = useLocalGroups();
  const pending = localGroups.filter((group) => group.state !== "rejected");
  const attention = localGroups.filter((group) => group.state === "rejected" || group.state === "unknown");
  const sending = localGroups.some((group) => group.state === "submitting");
  const status: SyncStatus = !online ? "offline" : active || sending ? "syncing" : "online";
  return { status, online, localGroups, pendingCount: pending.length, attentionCount: attention.length };
}

type BlockReason = "offline" | "syncing" | "localOnly";
export type GuardedAction = "edit" | "attachment" | "settle" | "deleteGroup" | "share";

/**
 * What can be changed in a group right now:
 * - a group created on this device (not synced yet): everything except
 *   receipts and sharing, while it isn't being sent;
 * - a synced group: everything while online, nothing while offline.
 * A blocked control stays tappable and explains itself with a short toast.
 */
export function useGroupAccess(groupId: string) {
  const t = useTranslations("offline");
  const online = useOnline();
  const local = useLocalGroup(groupId) ?? null;
  const isLocal = Boolean(local);
  const localEditable = local ? isLocalGroupEditable(local) : false;

  const reasonFor = (action: GuardedAction): BlockReason | null => {
    if (isLocal) {
      if (action === "attachment" || action === "share") return "localOnly";
      return localEditable ? null : "syncing";
    }
    return online ? null : "offline";
  };

  const notifyBlocked = useCallback(
    (action: GuardedAction, reason: BlockReason) => {
      const message =
        reason === "syncing"
          ? t("blockedSyncing")
          : reason === "localOnly"
            ? action === "share"
              ? t("blockedShareLocal")
              : t("blockedAttachmentLocal")
            : action === "attachment"
              ? t("blockedAttachmentOffline")
              : action === "settle"
                ? t("blockedSettleOffline")
                : action === "deleteGroup"
                  ? t("blockedDeleteGroupOffline")
                  : t("blockedEditOffline");
      toast({ message, variant: "info", duration: 3_000 });
    },
    [t]
  );

  const reasons = {
    edit: reasonFor("edit"),
    attachment: reasonFor("attachment"),
    settle: reasonFor("settle"),
    deleteGroup: reasonFor("deleteGroup"),
    share: reasonFor("share"),
  };

  /** True when allowed; otherwise shows why and returns false. */
  const check = (action: GuardedAction) => {
    const reason = reasons[action];
    if (reason) notifyBlocked(action, reason);
    return !reason;
  };

  return {
    online,
    isLocal,
    local,
    can: {
      edit: !reasons.edit,
      attachment: !reasons.attachment,
      settle: !reasons.settle,
      deleteGroup: !reasons.deleteGroup,
      share: !reasons.share,
    },
    check,
  };
}

export type GroupAccess = ReturnType<typeof useGroupAccess>;

/**
 * For a catch block: when the request failed because the connection dropped
 * (not because the server refused it), says so with the offline toast and
 * returns true; otherwise returns false and the caller shows its own error.
 * `message` overrides the default "wasn't saved" text.
 */
export function useOfflineFailureToast() {
  const t = useTranslations("offline");
  return useCallback(
    (error: unknown, message?: string) => {
      if (!isOfflineError(error)) return false;
      toast({ message: message ?? t("droppedNotSaved"), variant: "info", duration: 4_000 });
      return true;
    },
    [t]
  );
}
