"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Layout } from "@/components/layout/Layout";
import { ResourceNotFound } from "@/components/ResourceNotFound";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityFeed, ActivityRowsSkeleton } from "@/components/activity/ActivityFeed";
import { GroupDeletedDialog } from "@/components/group/GroupDeletedDialog";
import { useActivitySignals } from "@/hooks/useActivitySignals";
import { useGroupChanges, useGroupRealtime } from "@/hooks/useGroupRealtime";
import { useGroupDashboard } from "@/lib/groupExpenseData";
import { applyGroupChangesToDashboard } from "@/lib/realtime/groupChanges";

/** Full group activity ("View all activity" from the dashboard). */
export default function GroupActivity({ groupId }: { groupId: string }) {
  const t = useTranslations("activity");
  const tCommon = useTranslations("common");
  const tGroupDetails = useTranslations("groupDetails");
  const { data: dashboard, loading, refresh, applyChange } = useGroupDashboard(groupId);
  const [groupDeleted, setGroupDeleted] = useState(false);

  // Keep the group data live like the dashboard does: the feed reloads
  // whenever it changes (see useActivitySignals).
  useGroupRealtime({
    groupId,
    onExpenseChange: () => void refresh(),
  });
  useGroupChanges(
    groupId,
    (changes) => applyChange((prev) => applyGroupChangesToDashboard(prev, changes), changes.revision),
    () => setGroupDeleted(true)
  );
  const { refreshKey, existingExpenseIds } = useActivitySignals(dashboard);
  const group = dashboard?.group ?? null;

  if (!loading && !group) {
    return (
      <>
        <ResourceNotFound message={tCommon("groupNotFound")} actionLabel={tCommon("goHome")} actionHref="/" />
        {/* A deletion's cascading events can reload this to "not found" first. */}
        <GroupDeletedDialog open={groupDeleted} />
      </>
    );
  }

  return (
    <Layout>
      <div className="container max-w-3xl px-4 py-6 md:py-8">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href={`/group/${groupId}`}
            aria-label={tGroupDetails("backToGroup")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold sm:text-xl">
            {group ? t("pageTitle", { group: group.name }) : t("title")}
          </h1>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            {loading || !group ? (
              <div className="space-y-4">
                <Skeleton className="h-7 w-72" />
                <ActivityRowsSkeleton rows={6} />
              </div>
            ) : (
              <ActivityFeed groupId={groupId} refreshKey={refreshKey} existingExpenseIds={existingExpenseIds} />
            )}
          </CardContent>
        </Card>
      </div>
      <GroupDeletedDialog open={groupDeleted} />
    </Layout>
  );
}
