"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityItem } from "@/components/activity/ActivityItem";
import { useActivityTime } from "@/components/activity/useActivityTime";
import { useGroupActivity } from "@/hooks/useGroupActivity";
import { collapseRapidUpdates } from "@/lib/activity/feed";
import type { ActivityEvent, ActivityFilter } from "@/lib/activity/types";
import { cn } from "@/lib/utils";

const FILTERS: { value: ActivityFilter; label: "filterAll" | "filterExpenses" | "filterSettlements" | "filterMembers" }[] = [
  { value: "all", label: "filterAll" },
  { value: "expenses", label: "filterExpenses" },
  { value: "settlements", label: "filterSettlements" },
  { value: "members", label: "filterMembers" },
];

export function ActivityRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4 py-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityLoadError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("activity");
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <p className="text-sm text-muted-foreground">{t("loadError")}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}

/** The full group feed: filters, day groups and "Load more". */
export function ActivityFeed({
  groupId,
  refreshKey,
  existingExpenseIds,
  className,
}: {
  groupId: string;
  /** Changes whenever the group's data changes, to reload in the background. */
  refreshKey?: unknown;
  /** Expenses that can still be opened. */
  existingExpenseIds: ReadonlySet<string>;
  className?: string;
}) {
  const t = useTranslations("activity");
  const { dayKey, dayLabel, shortTime } = useActivityTime();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const { events, status, hasMore, loadingMore, loadMore, retry } = useGroupActivity(groupId, { filter, refreshKey });

  const days = useMemo(() => {
    const groups: { key: string; label: string; items: ActivityEvent[] }[] = [];
    for (const event of collapseRapidUpdates(events)) {
      const key = dayKey(event.createdAt);
      const last = groups[groups.length - 1];
      if (last?.key === key) last.items.push(event);
      else groups.push({ key, label: dayLabel(event.createdAt), items: [event] });
    }
    return groups;
  }, [dayKey, dayLabel, events]);

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("title")}>
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              filter === value
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {t(label)}
          </button>
        ))}
      </div>

      {status === "loading" ? (
        <div className="mt-4">
          <ActivityRowsSkeleton />
        </div>
      ) : status === "error" ? (
        <ActivityLoadError onRetry={() => void retry()} />
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <History className="h-8 w-8 text-muted-foreground/60" aria-hidden />
          <p className="text-sm font-medium">{t("emptyTitle")}</p>
          <p className="max-w-xs text-xs text-muted-foreground">{t("emptyHint")}</p>
        </div>
      ) : (
        days.map((day) => (
          <section key={day.key} className="mt-4">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">{day.label}</h3>
            <div className="divide-y divide-border/70">
              {day.items.map((event) => (
                <ActivityItem
                  key={event.id}
                  event={event}
                  groupId={groupId}
                  time={shortTime(event.createdAt)}
                  canOpen={Boolean(event.expenseId && existingExpenseIds.has(event.expenseId))}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {status === "ready" && hasMore ? (
        <div className="mt-4 flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t("loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
