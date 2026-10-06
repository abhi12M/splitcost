import { useCallback, useEffect, useRef, useState } from "react";
import { fetchExpenseActivity } from "@/lib/activity/client";
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
    } catch (error) {
      if (request !== requestRef.current) return;
      console.error("Failed to load expense history:", error);
      if (!hasDataRef.current) setStatus("error");
    }
  }, [expenseId]);

  useEffect(() => {
    if (!expenseId) return;
    void load();
    // Realtime can report a change a moment before its activity row is written.
    const recheck = window.setTimeout(() => void load(), ACTIVITY_RECHECK_MS);
    return () => window.clearTimeout(recheck);
  }, [expenseId, load, refreshKey]);

  return { events, status, retry: load };
}
