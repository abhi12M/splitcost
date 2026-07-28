/* eslint-disable react-refresh/only-export-components */

import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  FileImage,
  FileText,
  Plus,
  ReceiptText,
  Users,
} from "lucide-react";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { DashboardExpenseActivityChart } from "@/components/admin/DashboardExpenseActivityChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDisplayDateTime } from "@/components/ui/formatters";
import { formatCurrency } from "@/lib/avatar-utils";
import { listAllBlogs } from "@/lib/blog/queries";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/server";

type RecentGroup = {
  id: string;
  name: string;
  currency: string;
  created_at: string;
};

type RecentExpense = {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  created_at: string;
  groups?: { name?: string | null } | { name?: string | null }[] | null;
};

type ExpenseActivityPoint = {
  date: string;
  label: string;
  count: number;
};

export const metadata: Metadata = buildMetadata({
  title: "Admin",
  description: "Administrative dashboard for SplitCost.",
  path: ADMIN_BASE_PATH,
  noIndex: true,
});

export const dynamic = "force-dynamic";

function getGroupName(group: RecentExpense["groups"]) {
  return Array.isArray(group) ? group[0]?.name ?? "Unknown group" : group?.name ?? "Unknown group";
}

function buildExpenseActivity(createdAtValues: { created_at: string }[], startDate: Date) {
  const counts = new Map<string, number>();
  for (const expense of createdAtValues) {
    const date = expense.created_at.slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  return Array.from({ length: 30 }, (_, index): ExpenseActivityPoint => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);

    return {
      date: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date),
      label: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(date),
      count: counts.get(key) ?? 0,
    };
  });
}

async function getDashboardData() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const activityStart = new Date();
  activityStart.setUTCHours(0, 0, 0, 0);
  activityStart.setUTCDate(activityStart.getUTCDate() - 29);
  const [
    recentGroupsResult,
    recentExpensesResult,
    groupCountResult,
    memberCountResult,
    expenseCountResult,
    weeklyExpenseCountResult,
    activityExpensesResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("groups")
      .select("id,name,currency,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabaseAdmin
      .from("expenses")
      .select("id,group_id,description,amount,currency,date,created_at,groups(name)")
      .order("created_at", { ascending: false })
      .limit(6),
    supabaseAdmin.from("groups").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("group_members").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabaseAdmin.from("expenses").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabaseAdmin
      .from("expenses")
      .select("created_at")
      .gte("created_at", activityStart.toISOString()),
  ]);

  return {
    recentGroups: (recentGroupsResult.data ?? []) as RecentGroup[],
    recentExpenses: (recentExpensesResult.data ?? []) as RecentExpense[],
    totalGroups: groupCountResult.count ?? 0,
    totalMembers: memberCountResult.count ?? 0,
    totalExpenses: expenseCountResult.count ?? 0,
    weeklyExpenses: weeklyExpenseCountResult.count ?? 0,
    expenseActivity: buildExpenseActivity(activityExpensesResult.data ?? [], activityStart),
  };
}

export default async function Page() {
  const [blogs, dashboard] = await Promise.all([listAllBlogs(), getDashboardData()]);
  const publishedBlogs = blogs.filter((blog) => blog.status === "published");
  const draftBlogs = blogs.filter((blog) => blog.status === "draft");

  return (
    <AdminGate>
      <AdminShell>
        <div className="space-y-6">
          <section className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Overview</p>
              <h2 className="mt-1 text-2xl font-semibold text-foreground">Admin dashboard</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Monitor group activity and keep content moving.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`${ADMIN_BASE_PATH}/blogs/new`}>
                  <Plus className="h-4 w-4" />
                  New blog
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`${ADMIN_BASE_PATH}/media`}>
                  <FileImage className="h-4 w-4" />
                  Manage media
                </Link>
              </Button>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{dashboard.totalGroups}</p>
                  <p className="text-sm text-muted-foreground">Groups</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{dashboard.totalMembers}</p>
                  <p className="text-sm text-muted-foreground">Active members</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <ReceiptText className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{dashboard.totalExpenses}</p>
                  <p className="text-sm text-muted-foreground">
                    Expenses <span className="text-xs">{dashboard.weeklyExpenses} this week</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Recent expense activity</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">The latest entries across all groups.</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`${ADMIN_BASE_PATH}/groups`}>
                    Groups <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="divide-y">
                {dashboard.recentExpenses.length ? (
                  dashboard.recentExpenses.map((expense) => (
                    <Link
                      key={expense.id}
                      href={`/group/${expense.group_id}/expense/${expense.id}`}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:text-primary"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <ReceiptText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{expense.description}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {getGroupName(expense.groups)} | {formatDisplayDateTime(expense.created_at)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium">{formatCurrency(expense.amount, expense.currency)}</p>
                        <p className="text-xs text-muted-foreground">{expense.date}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="py-4 text-sm text-muted-foreground">No expenses recorded yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Content status</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Publishing work at a glance.</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`${ADMIN_BASE_PATH}/blogs`}>Manage</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="border-l-2 border-primary pl-3">
                    <p className="text-xl font-semibold">{publishedBlogs.length}</p>
                    <p className="text-xs text-muted-foreground">Published</p>
                  </div>
                  <div className="border-l-2 border-muted-foreground/30 pl-3">
                    <p className="text-xl font-semibold">{draftBlogs.length}</p>
                    <p className="text-xs text-muted-foreground">Drafts waiting</p>
                  </div>
                </div>
                <div className="space-y-2 border-t pt-4">
                  {blogs.slice(0, 4).map((blog) => (
                    <Link
                      key={blog.id}
                      href={`${ADMIN_BASE_PATH}/blogs/edit/${blog.id}`}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{blog.title}</p>
                        <p className="text-xs text-muted-foreground">{blog.category}</p>
                      </div>
                      <Badge variant={blog.status === "published" ? "default" : "secondary"}>{blog.status}</Badge>
                    </Link>
                  ))}
                  {!blogs.length ? <p className="text-sm text-muted-foreground">No blog posts yet.</p> : null}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Expense activity</CardTitle>
                <p className="text-sm text-muted-foreground">Expenses created each day in the last 30 days.</p>
              </CardHeader>
              <CardContent>
                <DashboardExpenseActivityChart data={dashboard.expenseActivity} />
              </CardContent>
            </Card>
            <div className="border p-5">
              <p className="text-sm font-medium text-foreground">Activity summary</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{dashboard.weeklyExpenses}</p>
              <p className="text-sm text-muted-foreground">expenses created in the last seven days</p>
              <Button asChild variant="outline" className="mt-5 w-full justify-between">
                <Link href={`${ADMIN_BASE_PATH}/groups`}>
                  Explore group activity <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>New groups</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href={`${ADMIN_BASE_PATH}/groups`}>View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="divide-y">
                {dashboard.recentGroups.length ? (
                  dashboard.recentGroups.map((group) => (
                    <Link
                      key={group.id}
                      href={`${ADMIN_BASE_PATH}/group/${group.id}`}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:text-primary"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.currency}</p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">
                        {formatDisplayDateTime(group.created_at)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="py-4 text-sm text-muted-foreground">No groups yet.</p>
                )}
              </CardContent>
            </Card>

            <div className="border p-5">
              <p className="text-sm font-medium text-foreground">Admin shortcuts</p>
              <div className="mt-4 grid gap-2">
                <Button asChild variant="outline" className="justify-between">
                  <Link href={`${ADMIN_BASE_PATH}/groups`}>
                    Browse groups <Users className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between">
                  <Link href={`${ADMIN_BASE_PATH}/blogs`}>
                    Review blog posts <FileText className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-between">
                  <Link href={`${ADMIN_BASE_PATH}/media`}>
                    Review media <FileImage className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </AdminShell>
    </AdminGate>
  );
}
