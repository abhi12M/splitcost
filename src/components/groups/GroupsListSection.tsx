"use client";

import { useRouter as useNextRouter } from "next/navigation";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";

import {
  GroceriesIcon,
  HouseholdIcon,
  PlaneIcon,
  ReceiptIcon,
} from "@/components/icons/CategoryIcons";
import { AvatarGroup } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionMenu } from "@/components/ui/action-menu";
import { formatDisplayDate, formatDisplayDateTime } from "@/components/ui/formatters";
import { formatCurrency } from "@/lib/avatar-utils";
import { ADMIN_BASE_PATH, LOCAL_GROUPS_KEY } from "@/lib/constants";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localStorage";
import { deleteGroup, GroupOverviewItemInterface, loadMyGroups } from "@/lib/storage";
import { LocalGroupBadge } from "@/components/sync/LocalGroupBadge";
import { useLocalGroups } from "@/hooks/useOffline";
import { LOCAL_GROUPS_CHANGED_EVENT } from "@/lib/offline/localGroups";

type HomeGroup = GroupOverviewItemInterface & {
  totalExpenses?: number;
  expenseCount?: number;
  updatedAt?: string | null;
  latestExpenseActivityAt?: string | null;
};

type ActivityFilter = "all" | "7-days" | "30-days" | "none";
type CreatedFilter = "all" | "today" | "7-days" | "30-days";
type ExpenseCountFilter = "all" | "none" | "1-10" | "11-49" | "50-plus";
type GroupSort = "latest-activity" | "newest" | "oldest" | "most-expenses" | "fewest-expenses";

const ALL_CURRENCIES = "all";

function isOnOrAfter(value: string | null | undefined, cutoff: Date) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= cutoff;
}

function startOfDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function dateValue(value: string | null | undefined) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function expenseCount(group: HomeGroup) {
  return group.expenseCount ?? group.expenses?.length ?? 0;
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [currencyFilter, setCurrencyFilter] = useState(ALL_CURRENCIES);
  const [createdFilter, setCreatedFilter] = useState<CreatedFilter>("all");
  const [expenseCountFilter, setExpenseCountFilter] =
    useState<ExpenseCountFilter>("all");
  const [sortBy, setSortBy] = useState<GroupSort>("latest-activity");
  const router = useRouter();
  const nextRouter = useNextRouter();

  const currencies = useMemo(
    () =>
      Array.from(new Set(groups.map((group) => group.currency).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [groups],
  );

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    activityFilter !== "all" ||
    currencyFilter !== ALL_CURRENCIES ||
    createdFilter !== "all" ||
    expenseCountFilter !== "all" ||
    sortBy !== "latest-activity";

  const filteredGroups = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const activityCutoff =
      activityFilter === "7-days"
        ? startOfDaysAgo(6)
        : activityFilter === "30-days"
          ? startOfDaysAgo(29)
          : null;
    const createdCutoff =
      createdFilter === "today"
        ? startOfDaysAgo(0)
        : createdFilter === "7-days"
          ? startOfDaysAgo(6)
          : createdFilter === "30-days"
            ? startOfDaysAgo(29)
            : null;

    const matchingGroups = groups.filter((group) => {
      if (normalizedQuery) {
        const searchableText = [group.id, group.name, ...(group.members ?? [])]
          .join(" ")
          .toLocaleLowerCase();
        if (!searchableText.includes(normalizedQuery)) return false;
      }

      if (currencyFilter !== ALL_CURRENCIES && group.currency !== currencyFilter) {
        return false;
      }

      if (activityFilter === "none" && group.latestExpenseActivityAt) return false;
      if (activityCutoff && !isOnOrAfter(group.latestExpenseActivityAt, activityCutoff)) {
        return false;
      }

      if (createdCutoff && !isOnOrAfter(group.createdAt, createdCutoff)) return false;

      const groupExpenseCount = expenseCount(group);
      if (expenseCountFilter === "none" && groupExpenseCount !== 0) return false;
      if (expenseCountFilter === "1-10" && (groupExpenseCount < 1 || groupExpenseCount > 10)) {
        return false;
      }
      if (expenseCountFilter === "11-49" && (groupExpenseCount < 11 || groupExpenseCount > 49)) {
        return false;
      }
      if (expenseCountFilter === "50-plus" && groupExpenseCount < 50) return false;

      return true;
    });

    return matchingGroups.sort((a, b) => {
      if (sortBy === "newest") return dateValue(b.createdAt) - dateValue(a.createdAt);
      if (sortBy === "oldest") return dateValue(a.createdAt) - dateValue(b.createdAt);
      if (sortBy === "most-expenses") return expenseCount(b) - expenseCount(a);
      if (sortBy === "fewest-expenses") return expenseCount(a) - expenseCount(b);

      const activityA = a.latestExpenseActivityAt ?? a.updatedAt ?? a.createdAt;
      const activityB = b.latestExpenseActivityAt ?? b.updatedAt ?? b.createdAt;
      return dateValue(activityB) - dateValue(activityA);
    });
  }, [activityFilter, createdFilter, currencyFilter, expenseCountFilter, groups, searchQuery, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setActivityFilter("all");
    setCurrencyFilter(ALL_CURRENCIES);
    setCreatedFilter("all");
    setExpenseCountFilter("all");
    setSortBy("latest-activity");
  };

  // Only the first load shows skeletons (`loading` starts true); reloads swap
  // the cards in place.
  const fetchGroups = useCallback(async () => {
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
        const { groups: loadedGroups, fromServer } = await loadMyGroups(groupIds);
        setGroups(loadedGroups);
        // Forget groups the server no longer has, but only on its word: offline
        // the list comes from saved copies, which may simply be missing some.
        if (fromServer) {
          const validGroupIds = loadedGroups.map((group) => group.id);
          setEncryptedItem(LOCAL_GROUPS_KEY, validGroupIds);
        }
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

  // A local group was created, changed, synced or re-keyed: reload the cards.
  useEffect(() => {
    if (adminMode) return;
    const reload = () => void fetchGroups();
    window.addEventListener(LOCAL_GROUPS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(LOCAL_GROUPS_CHANGED_EVENT, reload);
  }, [adminMode, fetchGroups]);

  const localGroups = useLocalGroups();
  const localStates = useMemo(
    () => new Map(localGroups.map((record) => [record.id, record.state])),
    [localGroups]
  );

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

        {adminMode ? (
          <div className="mb-6 rounded-xl border bg-card p-4 shadow-sm sm:mb-8">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              {t("filters.title")}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("filters.searchPlaceholder")}
                  aria-label={t("filters.searchLabel")}
                  className="pl-9"
                />
              </div>

              <Select value={activityFilter} onValueChange={(value) => setActivityFilter(value as ActivityFilter)}>
                <SelectTrigger aria-label={t("filters.activityLabel")}>
                  <SelectValue placeholder={t("filters.activityLabel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.activityAll")}</SelectItem>
                  <SelectItem value="7-days">{t("filters.activity7Days")}</SelectItem>
                  <SelectItem value="30-days">{t("filters.activity30Days")}</SelectItem>
                  <SelectItem value="none">{t("filters.activityNone")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                <SelectTrigger aria-label={t("filters.currencyLabel")}>
                  <SelectValue placeholder={t("filters.currencyLabel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CURRENCIES}>{t("filters.currencyAll")}</SelectItem>
                  {currencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={createdFilter} onValueChange={(value) => setCreatedFilter(value as CreatedFilter)}>
                <SelectTrigger aria-label={t("filters.createdLabel")}>
                  <SelectValue placeholder={t("filters.createdLabel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.createdAll")}</SelectItem>
                  <SelectItem value="today">{t("filters.createdToday")}</SelectItem>
                  <SelectItem value="7-days">{t("filters.created7Days")}</SelectItem>
                  <SelectItem value="30-days">{t("filters.created30Days")}</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={expenseCountFilter}
                onValueChange={(value) => setExpenseCountFilter(value as ExpenseCountFilter)}
              >
                <SelectTrigger aria-label={t("filters.expenseCountLabel")}>
                  <SelectValue placeholder={t("filters.expenseCountLabel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.expenseCountAll")}</SelectItem>
                  <SelectItem value="none">{t("filters.expenseCountNone")}</SelectItem>
                  <SelectItem value="1-10">{t("filters.expenseCount1To10")}</SelectItem>
                  <SelectItem value="11-49">{t("filters.expenseCount11To49")}</SelectItem>
                  <SelectItem value="50-plus">{t("filters.expenseCount50Plus")}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as GroupSort)}>
                <SelectTrigger aria-label={t("filters.sortLabel")}>
                  <SelectValue placeholder={t("filters.sortLabel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest-activity">{t("filters.sortLatestActivity")}</SelectItem>
                  <SelectItem value="newest">{t("filters.sortNewest")}</SelectItem>
                  <SelectItem value="oldest">{t("filters.sortOldest")}</SelectItem>
                  <SelectItem value="most-expenses">{t("filters.sortMostExpenses")}</SelectItem>
                  <SelectItem value="fewest-expenses">{t("filters.sortFewestExpenses")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 flex min-h-9 flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {t("filters.resultCount", { shown: filteredGroups.length, total: groups.length })}
              </p>
              {hasActiveFilters ? (
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  {t("filters.clear")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {(adminMode ? filteredGroups : groups).map((group) => {
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
                    <CardTitle className="mt-3 flex items-center gap-2">
                      <span className="min-w-0 truncate">{group.name}</span>
                      {localStates.get(group.id) ? <LocalGroupBadge state={localStates.get(group.id)!} /> : null}
                    </CardTitle>
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

          {adminMode && filteredGroups.length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center">
              <p className="font-medium text-foreground">{t("filters.noResultsTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("filters.noResultsDescription")}</p>
              {hasActiveFilters ? (
                <Button type="button" variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                  {t("filters.clear")}
                </Button>
              ) : null}
            </div>
          ) : null}

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
