"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, History } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityLoadError, ActivityRowsSkeleton, LocalActivityNotice } from "@/components/activity/ActivityFeed";
import { useLocalGroup } from "@/hooks/useOffline";
import { ActivityItem } from "@/components/activity/ActivityItem";
import { useActivityTime } from "@/components/activity/useActivityTime";
import { useGroupActivity } from "@/hooks/useGroupActivity";
import { collapseRapidUpdates } from "@/lib/activity/feed";

const RECENT_COUNT = 5;
// Collapsing bursts can merge several rows, so fetch a few extra.
const FETCH_COUNT = 12;

type RecentActivityCardProps = {
  groupId: string;
  refreshKey?: unknown;
  existingExpenseIds: ReadonlySet<string>;
};

/** Dashboard summary: the latest few entries and a link to the full feed. */
export function RecentActivityCard(props: RecentActivityCardProps) {
  const t = useTranslations("activity");
  // A group that hasn't reached the server has no history there yet; wait to
  // know which it is before asking the server.
  const local = useLocalGroup(props.groupId);
  if (local !== null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <History className="h-5 w-5 shrink-0 text-primary" />
            {t("recent")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {local ? <LocalActivityNotice /> : <ActivityRowsSkeleton rows={3} />}
        </CardContent>
      </Card>
    );
  }
  return <RecentActivityContent {...props} />;
}

function RecentActivityContent({ groupId, refreshKey, existingExpenseIds }: RecentActivityCardProps) {
  const t = useTranslations("activity");
  const { dayLabel, shortTime } = useActivityTime();
  const { events, status, retry } = useGroupActivity(groupId, { limit: FETCH_COUNT, refreshKey });
  const recent = useMemo(() => collapseRapidUpdates(events).slice(0, RECENT_COUNT), [events]);
  const today = t("today");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <History className="h-5 w-5 shrink-0 text-primary" />
          {t("recent")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {status === "loading" ? (
          <ActivityRowsSkeleton rows={3} />
        ) : status === "error" ? (
          <ActivityLoadError onRetry={() => void retry()} />
        ) : recent.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("emptyHint")}</p>
        ) : (
          <div className="divide-y divide-border/70">
            {recent.map((event) => {
              // Older entries need their day; today's read fine as "5 min ago".
              const day = dayLabel(event.createdAt);
              return (
                <ActivityItem
                  key={event.id}
                  event={event}
                  groupId={groupId}
                  time={day === today ? shortTime(event.createdAt) : day}
                  canOpen={Boolean(event.expenseId && existingExpenseIds.has(event.expenseId))}
                />
              );
            })}
          </div>
        )}
        <Link
          href={`/group/${groupId}/activity`}
          className="mt-2 flex items-center justify-center gap-1 border-t border-border/70 pt-3 text-sm font-medium text-primary hover:underline"
        >
          {t("viewAll")}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
