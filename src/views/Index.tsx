"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Plus,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import {
  BrandIcon,
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
import { ADMIN_BASE_PATH, APP_NAME, LOCAL_GROUPS_KEY } from "@/lib/constants";
import { getEncryptedItem, setEncryptedItem } from "@/lib/localStorage";
import { deleteGroup, GroupOverviewItemInterface, loadGroupsByIds } from "@/lib/storage";

type HomeGroup = GroupOverviewItemInterface & {
  totalExpenses?: number;
  expenseCount?: number;
  updatedAt?: string | null;
  latestExpenseActivityAt?: string | null;
};

const features = [
  {
    icon: Users,
    title: "No sign-up required",
    description:
      "Create a shared expense group, send the link, and start tracking expenses right away.",
  },
  {
    icon: ReceiptIcon,
    title: "Flexible bill splitting",
    description:
      "Split expenses equally, by percentage, or with custom amounts, including expenses paid by one person or shared across multiple payers.",
  },
  {
    icon: PlaneIcon,
    title: "Built for trips and roommates",
    description:
      "Use one expense tracker for vacations, apartment bills, dinners, events, and shared shopping.",
  },
  {
    icon: Users,
    title: "Easy group updates",
    description:
      "Edit group names, members, and currency whenever plans change, without rebuilding the whole expense tracker.",
  },
];

const useCases = [
  {
    title: "Trip expense tracker",
    description:
      "Track flights, hotels, food, taxis, and activities in one shared travel expense app.",
  },
  {
    title: "Roommate bill splitter",
    description:
      "Split rent, groceries, utilities, and household costs without messy spreadsheets.",
  },
  {
    title: "Group event expenses",
    description:
      "Keep wedding parties, weekend outings, office lunches, and friend groups aligned on who owes what.",
  },
];

/** Decorative desktop preview — not live data. */
function LandingDashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-primary/[0.07] blur-2xl"
        aria-hidden
      />
      <Card className="relative overflow-hidden border-primary/15 shadow-lg shadow-primary/5">
        <div className="flex gap-0 border-b border-border/80 bg-muted/40">
          <div className="hidden w-[28%] shrink-0 border-r border-border/80 bg-muted/30 p-3 xl:block">
            <div className="mb-3 h-2 w-16 rounded-full bg-foreground/15" />
            {["Dashboard", "Groups", "Expenses"].map((label) => (
              <div
                key={label}
                className="mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
                {label}
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Overview
                </p>
                <p className="text-sm font-semibold text-foreground">Group dashboard</p>
              </div>
              <LayoutDashboard className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {[
                { label: "Total expenses", hint: "This month", tone: "default" as const },
                { label: "You paid", hint: "Your share", tone: "muted" as const },
                { label: "You owe", hint: "Across groups", tone: "owe" as const },
                { label: "You are owed", hint: "From friends", tone: "owed" as const },
              ].map((cell) => (
                <div
                  key={cell.label}
                  className="rounded-xl border border-border/80 bg-card p-3 shadow-sm"
                >
                  <p className="text-[10px] font-medium text-muted-foreground">{cell.label}</p>
                  <p
                    className={`mt-1 font-semibold tabular-nums ${
                      cell.tone === "owe"
                        ? "text-destructive"
                        : cell.tone === "owed"
                          ? "text-success"
                          : "text-foreground"
                    }`}
                  >
                    ——
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{cell.hint}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 rounded-xl border border-dashed border-primary/20 bg-primary/[0.04] p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-foreground">
                <Wallet className="h-3.5 w-3.5 text-primary" aria-hidden />
                Recent activity
              </div>
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-foreground/10" />
                <div className="h-2 w-[85%] rounded-full bg-foreground/10" />
                <div className="h-2 w-[60%] rounded-full bg-foreground/10" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
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

export default function HomePage({ adminMode = false }: { adminMode?: boolean }) {
  const [groups, setGroups] = useState<HomeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const router = useRouter();

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

  return (
    <Layout>
      {!adminMode && (
        <section className="gradient-hero relative overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
          <div
            className="pointer-events-none absolute -right-24 top-1/2 h-[min(520px,80vw)] w-[min(520px,80vw)] -translate-y-1/2 rounded-full bg-primary/[0.12] blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-primary/[0.08] blur-3xl sm:h-80 sm:w-80"
            aria-hidden
          />
          <div className="container relative">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
              <div className="text-center lg:col-span-6 lg:text-left xl:col-span-5">
                <div className="mb-6 flex flex-col items-center gap-4 sm:mb-8 lg:items-start">
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Smart expense sharing
                  </span>
                  <BrandIcon
                    className="h-[4.25rem] w-[4.25rem] sm:h-24 sm:w-24 lg:h-20 lg:w-20"
                    size={96}
                  />
                </div>

                <h1 className="mb-4 text-balance text-3xl font-bold leading-[1.15] text-foreground sm:text-4xl md:text-5xl lg:mb-5 lg:text-[2.75rem] lg:leading-tight xl:text-[3.1rem]">
                  Split, track, and settle{" "}
                  <span className="text-primary">shared bills and group payments</span> without the
                  spreadsheet chaos.
                </h1>

                <p className="mx-auto mb-3 max-w-xl text-balance text-base text-muted-foreground sm:text-lg lg:mx-0">
                  Track shared expenses, split bills instantly, manage balances, and simplify group
                  payments in one dashboard built for trips, roommates, and events.
                </p>
                <p className="mx-auto mb-8 max-w-xl text-balance text-sm text-muted-foreground sm:text-base lg:mx-0">
                  Create a group, add expenses with one or multiple payers, and see who owes whom in
                  real time. No sign-up required.
                </p>

                <div className="mx-auto mb-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center lg:mx-0 lg:justify-start">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 w-full text-base font-semibold sm:h-12 sm:w-auto sm:min-w-[11rem]"
                  >
                    <Link href="/create-group">
                      Start free
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 w-full border-primary/25 bg-card/80 text-base font-semibold hover:bg-primary/5 sm:h-12 sm:w-auto sm:min-w-[11rem]"
                  >
                    <Link href="/faq">
                      <Users className="h-5 w-5" />
                      How splits work
                    </Link>
                  </Button>
                </div>

                <ul className="mx-auto flex max-w-lg flex-col gap-3 text-left text-sm text-muted-foreground sm:mx-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-8 sm:gap-y-3 sm:text-center lg:mx-0 lg:justify-start lg:text-left">
                  <li className="inline-flex items-center justify-center gap-2 sm:justify-center lg:justify-start">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>100% free to start</span>
                  </li>
                  <li className="inline-flex items-center justify-center gap-2 sm:justify-center lg:justify-start">
                    <CreditCard className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>No credit card required</span>
                  </li>
                  <li className="inline-flex items-center justify-center gap-2 sm:justify-center lg:justify-start">
                    <Smartphone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>Works on web and mobile</span>
                  </li>
                </ul>
              </div>

              <div className="hidden lg:col-span-6 lg:block xl:col-span-7" aria-hidden>
                <LandingDashboardPreview />
              </div>
            </div>
          </div>
        </section>
      )}

      {loading ? (
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
      ) : (
        <section className="py-10 sm:py-12 md:py-16">
          <div className="container">
            <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="mb-1 text-xl font-bold text-foreground sm:text-2xl">
                  {adminMode ? "All Groups" : "Your Groups"}
                </h2>
                <p className="text-pretty text-sm text-muted-foreground sm:text-base">
                  {adminMode
                    ? "Admin view of all expense groups"
                    : "Open a recent expense group and keep tracking shared bills"}
                </p>
                {adminMode ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Total groups:{" "}
                    <span className="font-semibold text-foreground">{groups.length}</span>
                  </p>
                ) : null}
              </div>
              {!adminMode && (
                <Button asChild variant="default" size="sm" className="h-10 w-full shrink-0 sm:h-9 sm:w-auto">
                  <Link href="/create-group">
                    <Plus className="h-4 w-4" />
                    New group
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
                    onClick={() =>
                      router.push(
                        adminMode
                          ? `${ADMIN_BASE_PATH}/group/${group.id}`
                          : `/group/${group.id}`
                      )
                    }
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
                              deleteTitle="Delete group?"
                              deleteDescription={`Are you sure you want to delete ${group.name}? This will remove the group and its expenses.`}
                              stopPropagation
                            />
                          ) : null}
                        </div>
                        <CardTitle className="mt-3">{group.name}</CardTitle>
                        {adminMode ? (
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Created {formatDisplayDateTime(group.createdAt)}</p>
                            <p>
                              Updated {formatDisplayDateTime(group.updatedAt ?? group.createdAt)}
                            </p>
                            <p>
                              Latest expense activity{" "}
                              {formatDisplayDateTime(group.latestExpenseActivityAt)}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Created {formatDisplayDate(group.createdAt)}
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
                            <p className="text-xs text-muted-foreground">Total</p>
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
                        <p className="font-medium text-foreground mb-1">
                          Create New Group
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Start tracking shared expenses
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {!adminMode && (
        <section className="py-10 sm:py-12 md:py-16 bg-muted/30">
          <div className="container">
            <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
              <h2 className="mb-3 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
                Why use {APP_NAME} as your expense splitter?
              </h2>
              <p className="text-pretty text-sm text-muted-foreground sm:text-base">
                Built for the everyday situations where a group expense tracker
                saves time: travel, rent, groceries, nights out, shared
                events, and plans where group members need to update people or
                payment details later.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 md:gap-6">
              {features.map((feature, index) => (
                <div key={index}>
                  <Card className="text-center h-full">
                    <CardContent className="pt-8">
                      <div className="w-14 h-14 rounded-2xl bg-primary/12 flex items-center justify-center mx-auto mb-5 ring-1 ring-primary/15">
                        <feature.icon className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!adminMode && (
        <section className="py-10 sm:py-12 md:py-16">
          <div className="container">
            <div className="mb-8 max-w-3xl sm:mb-10">
              <h2 className="mb-3 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
                One shared bill tracker for every group plan
              </h2>
              <p className="text-pretty text-sm text-muted-foreground sm:text-base">
                Whether you need a roommate expense tracker, a trip expense
                tracker, or a simple way to divide everyday bills with friends,
                {` ${APP_NAME} `} keeps balances clear with flexible splits,
                multiple paid-by support, and simple settlements.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 md:gap-6">
              {useCases.map((useCase) => (
                <Card key={useCase.title} className="h-full">
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {useCase.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {useCase.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {!adminMode && (
        <section className="py-10 sm:py-12 md:py-16 bg-muted/30">
          <div className="container max-w-4xl">
            <div className="mb-8 text-center sm:mb-10">
              <h2 className="mb-3 text-xl font-bold text-foreground sm:text-2xl md:text-3xl">
                How to split expenses in minutes
              </h2>
              <p className="mx-auto max-w-2xl text-pretty text-sm text-muted-foreground sm:text-base">
                The workflow is intentionally simple so your group spends less
                time managing bills and more time moving on.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 md:gap-6">
              {[
                "Create a group and add the people involved.",
                "Log each expense with one payer or multiple payers plus the right participants.",
                "Edit the group or expense details any time, then review balances and settle up with fewer payments.",
              ].map((step, index) => (
                <Card key={step} className="h-full">
                  <CardContent className="pt-6 text-center">
                    <p className="text-sm font-semibold text-foreground mb-2">
                      Step {index + 1}
                    </p>
                    <p className="text-sm text-foreground">{step}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
