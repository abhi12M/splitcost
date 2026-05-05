"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Plus, Users } from "lucide-react";

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
        <section className="gradient-hero py-16 md:py-[3rem]">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="flex justify-center mb-6">
                <BrandIcon className="w-20 h-20" />
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
                Split expenses with friends,
                <span className="block text-primary">
                  roommates, travel groups, and shared plans
                </span>
              </h1>

              <p className="text-lg text-muted-foreground mb-4 text-balance">
                {APP_NAME} is a free expense splitter that helps groups track
                shared bills, balances, and settlements in one place.
              </p>
              <p className="text-base text-muted-foreground mb-8 text-balance max-w-2xl mx-auto">
                Create a group, add expenses, choose one payer or split the payment
                across multiple people, and instantly see who owes whom. No sign-up
                required, no spreadsheet cleanup, and no confusion when it is time
                to settle up.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-base">
                  <Link href="/create-group">
                    <Plus className="w-5 h-5" />
                    Create New Group
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base">
                  <Link href="/faq">
                    Learn How Splitcost Works
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-8 w-28 rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <GroupCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {adminMode ? "All Groups" : "Your Groups"}
                </h2>
                <p className="text-muted-foreground">
                  {adminMode
                    ? "Admin view of all expense groups"
                    : "Open a recent expense group and keep tracking shared bills"}
                </p>
                {adminMode ? (
                  <p className="text-sm text-muted-foreground mt-2">
                    Total groups:{" "}
                    <span className="font-semibold text-foreground">{groups.length}</span>
                  </p>
                ) : null}
              </div>
              {!adminMode && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/create-group">
                    <Plus className="w-4 h-4" />
                    New Group
                  </Link>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container">
            <div className="text-center mb-12 max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Why use {APP_NAME} as your expense splitter?
              </h2>
              <p className="text-muted-foreground">
                Built for the everyday situations where a group expense tracker
                saves time: travel, rent, groceries, nights out, shared
                events, and plans where group members need to update people or
                payment details later.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div key={index}>
                  <Card className="text-center h-full">
                    <CardContent className="pt-8">
                      <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5">
                        <feature.icon className="w-7 h-7 text-secondary-foreground" />
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
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="max-w-3xl mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                One shared bill tracker for every group plan
              </h2>
              <p className="text-muted-foreground">
                Whether you need a roommate expense tracker, a trip expense
                tracker, or a simple way to divide everyday bills with friends,
                {` ${APP_NAME} `} keeps balances clear with flexible splits,
                multiple paid-by support, and simple settlements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-4xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                How to split expenses in minutes
              </h2>
              <p className="text-muted-foreground">
                The workflow is intentionally simple so your group spends less
                time managing bills and more time moving on.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
