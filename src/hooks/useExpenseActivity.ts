import { useCallback, useEffect, useRef, useState } from "react";
import { fetchExpenseActivity } from "@/lib/activity/client";
import { readCachedActivity, writeCachedActivity } from "@/lib/offline/cache";
import type { ActivityEvent } from "@/lib/activity/types";
import { ACTIVITY_RECHECK_MS, type ActivityStatus } from "./useGroupActivity";

/** One expense's history. Changing `refreshKey` reloads it in the background. */
export function useExpenseActivity(expenseId: string, refreshKey?: unknown) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [status, setStatus] = useState<ActivityStatus>("loading");
  const requestRef = useRef(0);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    try {
      const next = await fetchExpenseActivity(expenseId);
      if (request !== requestRef.current) return;
      hasDataRef.current = true;
      setEvents(next);
      setStatus("ready");
      void writeCachedActivity(`expense:${expenseId}`, { events: next });
    } catch (error) {
      if (request !== requestRef.current) return;
      console.error("Failed to load expense history:", error);
      if (!hasDataRef.current) setStatus("error");
    }
  }, [expenseId]);

  useEffect(() => {
    if (!expenseId) return;
    let cancelled = false;
    if (!hasDataRef.current) {
      // Show the saved history at once (a quick local read); the load below refreshes it.
      void readCachedActivity(`expense:${expenseId}`).then((saved) => {
        if (cancelled || !saved || hasDataRef.current) return;
        hasDataRef.current = true;
        setEvents(saved.events);
        setStatus("ready");
      });
    }
    void load();
    // Realtime can report a change a moment before its activity row is written.
    const recheck = window.setTimeout(() => void load(), ACTIVITY_RECHECK_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(recheck);
    };
  }, [expenseId, load, refreshKey]);

  return { events, status, retry: load };
}
