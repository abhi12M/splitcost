import { useCallback, useEffect, useRef, useState } from "react";
import { fetchGroupActivity } from "@/lib/activity/client";
import { readCachedActivity, writeCachedActivity } from "@/lib/offline/cache";
import type { CachedActivity } from "@/lib/offline/db";
import type { ActivityCursor, ActivityEvent, ActivityFilter } from "@/lib/activity/types";

export type ActivityStatus = "loading" | "ready" | "error";

/** How long after a refresh to look once more for a just-written row. */
export const ACTIVITY_RECHECK_MS = 2000;

const newestFirst = (a: ActivityEvent, b: ActivityEvent) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

/** Activity rows are never edited or removed, so merging by id is exact. */
function merge(fresh: ActivityEvent[], existing: ActivityEvent[]) {
  const byId = new Map(existing.map((event) => [event.id, event]));
  for (const event of fresh) byId.set(event.id, event);
  return [...byId.values()].sort(newestFirst);
}

/**
 * The group feed, page by page. Changing `refreshKey` reloads the newest page
 * in the background (no skeleton) and merges it in, keeping older pages the
 * user has already loaded.
 */
export function useGroupActivity(
  groupId: string,
  { filter = "all", limit = 20, refreshKey }: { filter?: ActivityFilter; limit?: number; refreshKey?: unknown } = {}
) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [cursor, setCursor] = useState<ActivityCursor | null>(null);
  const [status, setStatus] = useState<ActivityStatus>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  // Ignores responses for a filter or group the screen has moved away from.
  const requestRef = useRef(0);
  const viewKey = `${groupId}|${filter}|${limit}`;
  const shownKeyRef = useRef<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    const request = ++requestRef.current;
    const isNewView = shownKeyRef.current !== viewKey;
    let saved: CachedActivity | null = null;
    if (isNewView) {
      setStatus("loading");
      setEvents([]);
      setCursor(null);
      // Show the saved newest page at once (a quick local read), then ask the server.
      saved = await readCachedActivity(`group:${viewKey}`);
      if (request !== requestRef.current) return;
      if (saved) {
        setEvents(saved.events);
        setCursor(saved.nextCursor ?? null);
        setStatus("ready");
        shownKeyRef.current = viewKey;
      }
    }
    try {
      const page = await fetchGroupActivity(groupId, { filter, limit });
      if (request !== requestRef.current) return;
      void writeCachedActivity(`group:${viewKey}`, { groupId, events: page.events, nextCursor: page.nextCursor });
      const existing = isNewView ? saved?.events ?? [] : eventsRef.current;
      const oldestFresh = page.events[page.events.length - 1];
      // A full page entirely newer than what's shown leaves a gap; start over.
      const hasGap = Boolean(page.nextCursor && existing[0] && oldestFresh && newestFirst(oldestFresh, existing[0]) < 0);
      if (!existing.length || hasGap) {
        setEvents(page.events);
        setCursor(page.nextCursor);
      } else {
        setEvents(merge(page.events, existing));
      }
      shownKeyRef.current = viewKey;
      setStatus("ready");
    } catch (error) {
      if (request !== requestRef.current) return;
      console.error("Failed to load activity:", error);
      // A failed background refresh keeps what's already shown, including the saved page.
      if (!saved && (isNewView || !eventsRef.current.length)) setStatus("error");
    }
  }, [filter, groupId, limit, viewKey]);

  useEffect(() => {
    if (!groupId) return;
    void loadFirstPage();
    // Realtime can report a change a moment before its activity row is
    // written, so look again shortly after.
    const recheck = window.setTimeout(() => void loadFirstPage(), ACTIVITY_RECHECK_MS);
    return () => window.clearTimeout(recheck);
  }, [groupId, loadFirstPage, refreshKey]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    const request = requestRef.current;
    setLoadingMore(true);
    try {
      const page = await fetchGroupActivity(groupId, { filter, limit, cursor });
      if (request !== requestRef.current) return;
      setEvents((current) => merge(page.events, current));
      setCursor(page.nextCursor);
    } catch (error) {
      console.error("Failed to load more activity:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, filter, groupId, limit, loadingMore]);

  return { events, status, hasMore: Boolean(cursor), loadingMore, loadMore, retry: loadFirstPage };
}
