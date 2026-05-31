"use client";

import { useRouter as useNextRouter } from "next/navigation";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";

import {
  GroceriesIcon,
  HouseholdIcon,
  PlaneIcon,
  ReceiptIcon,
} from "@/components/icons/CategoryIcons";
import { AvatarGroup } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionMenu } from "@/components/ui/action-menu";
import { formatDisplayDate, formatDisplayDateTime } from "@/components/ui/formatters";
import { formatCurrency } from "@/lib/avatar-utils";
import { ADMIN_BASE_PATH, LOCAL_GROUPS_KEY } from "@/lib/constants";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localStorage";
import { deleteGroup, GroupOverviewItemInterface, loadGroupsByIds } from "@/lib/storage";

type HomeGroup = GroupOverviewItemInterface & {
  totalExpenses?: number;
  expenseCount?: number;
  updatedAt?: string | null;
  latestExpenseActivityAt?: string | null;
};

function getGroupIcon(name: string) {
  const lower = name.toLowerCase();
  if (
    lower.includes("trip") ||
    lower.includes("travel") ||
    lower.includes("vacation")
  ) {
    return PlaneIcon;
  }
  if (
    lower.includes("apartment") ||
    lower.includes("house") ||
    lower.includes("rent")
  ) {
    return HouseholdIcon;
  }
  if (lower.includes("grocery") || lower.includes("food")) {
    return GroceriesIcon;
  }
  return ReceiptIcon;
}

function GroupCardSkeleton() {
  return (
    <div className="h-full">
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <Skeleton className="w-8 h-8 rounded-md" />
        </div>
        <Skeleton className="h-5 w-2/3" />
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="w-7 h-7 rounded-full" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-5 w-20 ml-auto" />
            <Skeleton className="h-3 w-10 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function GroupsListSection({ adminMode = false }: { adminMode?: boolean }) {
  const t = useTranslations("groups");
  const [groups, setGroups] = useState<HomeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const router = useRouter();
  const nextRouter = useNextRouter();

  const fetchGroups = useCallback(async () => {
    setLoading(true);

    try {
      if (adminMode) {
        const res = await fetch("/api/groups", { cache: "no-store" });
        if (!res.ok) {
          setGroups([]);
          return;
        }
        const allGroups = (await res.json()) as HomeGroup[];
        setGroups(allGroups);
      } else {
        const groupIds = getEncryptedItem<string[]>(LOCAL_GROUPS_KEY, []);
        const loadedGroups = await loadGroupsByIds(groupIds);
        setGroups(loadedGroups);
        const validGroupIds = loadedGroups.map((group) => group.id);
        setEncryptedItem(LOCAL_GROUPS_KEY, validGroupIds);
      }
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [adminMode]);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  const handleDeleteGroup = async (groupId: string) => {
    try {
      setDeletingGroupId(groupId);
      const deleted = await deleteGroup(groupId);
      if (!deleted) {
        return;
      }

      setGroups((current) => current.filter((group) => group.id !== groupId));
    } finally {
      setDeletingGroupId(null);
    }
  };

  if (loading) {
    return (
      <section className="py-10 sm:py-12 md:py-16">
        <div className="container">
          <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-7 w-48 sm:h-8" />
              <Skeleton className="h-4 w-full max-w-xs sm:max-w-md" />
            </div>
            <Skeleton className="h-10 w-full shrink-0 rounded-md sm:h-9 sm:w-32" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <GroupCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 sm:py-12 md:py-16">
      <div className="container">
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
              {adminMode ? t("titleAll") : t("titleYour")}
            </h2>
            <p className="text-pretty text-sm text-muted-foreground sm:text-base">
              {adminMode ? t("subtitleAdmin") : t("subtitle")}
            </p>
            {adminMode ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("totalGroups", { count: groups.length })}
              </p>
            ) : null}
          </div>
          {!adminMode && (
            <Button asChild variant="default" size="sm" className="h-10 w-full shrink-0 sm:h-9 sm:w-auto">
              <Link href="/create-group">
                <Plus className="h-4 w-4" />
                {t("newGroup")}
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {groups.map((group) => {
            const IconComponent = getGroupIcon(group.name);
            const totalExpenses =
              group.totalExpenses ??
              group?.expenses?.reduce((sum, expense) => sum + (expense?.amount || 0), 0) ??
              0;

            return (
              <div
                key={group.id}
                onClick={() => {
                  const href = adminMode
                    ? `${ADMIN_BASE_PATH}/group/${group.id}`
                    : `/group/${group.id}`;

                  if (adminMode) {
                    nextRouter.push(href);
                    return;
                  }

                  router.push(href);
                }}
              >
                <Card hover className="h-full group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-primary-muted flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      {adminMode ? (
                        <ActionMenu
                          editHref={`/group/${group.id}/edit`}
                          onDelete={() => handleDeleteGroup(group.id)}
                          isDeleting={deletingGroupId === group.id}
                          deleteTitle={t("deleteTitle")}
                          deleteDescription={t("deleteDescription")}
                          stopPropagation
                        />
                      ) : null}
                    </div>
                    <CardTitle className="mt-3">{group.name}</CardTitle>
                    {adminMode ? (
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{t("created", { date: formatDisplayDateTime(group.createdAt) })}</p>
                        <p>
                          {t("updated", {
                            date: formatDisplayDateTime(group.updatedAt ?? group.createdAt),
                          })}
                        </p>
                        <p>
                          {t("latestExpenseActivity", {
                            date: formatDisplayDateTime(group.latestExpenseActivityAt),
                          })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("created", { date: formatDisplayDate(group.createdAt) })}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AvatarGroup names={group?.members} showBelow />
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-foreground">
                          {formatCurrency(totalExpenses, group.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">{t("total")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}

          {!adminMode && (
            <div>
              <Link href="/create-group">
                <Card
                  hover
                  className="h-full border-dashed border-2 bg-transparent hover:bg-muted/50"
                >
                  <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Plus className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-foreground mb-1">{t("createCardTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("createCardSubtitle")}</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
