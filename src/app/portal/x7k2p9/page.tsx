/* eslint-disable react-refresh/only-export-components */

import type { Metadata } from "next";
import Link from "next/link";
import {
  FileImage,
  Eye,
  Plus,
} from "lucide-react";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { DashboardExpenseActivityChart } from "@/components/admin/DashboardExpenseActivityChart";
import { ReceiptIcon } from "@/components/icons/CategoryIcons";
import { AvatarGroup } from "@/components/ui/UserAvatar";
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
  updated_at: string | null;
  memberCount: number;
  members: string[];
  total: number;
  latestActivityAt: string;
};

type GroupSummaryResult = {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  updatedAt: string | null;
  memberCount: number;
  members: string[];
  totalExpenses: number;
  latestExpenseActivityAt: string | null;
};

export const metadata: Metadata = buildMetadata({
  title: "Admin",
  description: "Administrative dashboard for SplitCost.",
  path: ADMIN_BASE_PATH,
  noIndex: true,
});

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const activityStart = new Date();
  activityStart.setUTCFullYear(activityStart.getUTCFullYear() - 1);
  activityStart.setUTCMonth(activityStart.getUTCMonth() - 1);
  const groupSummaryClient = supabaseAdmin as unknown as {
    rpc: (
      functionName: "load_group_summaries",
      args: { p_group_ids: null },
    ) => Promise<{ data: GroupSummaryResult[] | null }>;
  };

  const [recentGroupsResult, activityExpensesResult, activityGroupsResult] = await Promise.all([
    groupSummaryClient.rpc("load_group_summaries", { p_group_ids: null }),
    supabaseAdmin
      .from("expenses")
      .select("created_at")
      .gte("created_at", activityStart.toISOString()),
    supabaseAdmin
      .from("groups")
      .select("created_at")
      .gte("created_at", activityStart.toISOString()),
  ]);

  const recentGroups = ((recentGroupsResult.data ?? []) as GroupSummaryResult[]).slice(0, 10);

  return {
    recentGroups: recentGroups.map(
      (group): RecentGroup => ({
        id: group.id,
        name: group.name,
        currency: group.currency,
        created_at: group.createdAt,
        updated_at: group.updatedAt,
        memberCount: group.memberCount,
        members: group.members,
        total: Number(group.totalExpenses),
        latestActivityAt: group.latestExpenseActivityAt ?? group.updatedAt ?? group.createdAt,
      }),
    ),
    activityEvents: {
      expenses: (activityExpensesResult.data ?? []).map((expense) => expense.created_at),
      groups: (activityGroupsResult.data ?? []).map((group) => group.created_at),
    },
  };
}

export default async function Page() {
  const [blogs, dashboard] = await Promise.all([listAllBlogs(), getDashboardData()]);
  const publishedBlogs = blogs.filter((blog) => blog.status === "published");
  const draftBlogs = blogs.filter((blog) => blog.status === "draft");
  const totalViews = blogs.reduce((sum, blog) => sum + blog.views, 0);

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

          <section className="grid gap-6 xl:grid-cols-12">
            <Card className="xl:col-span-5">
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
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="border-l-2 border-primary pl-3">
                    <p className="text-xl font-semibold">{publishedBlogs.length}</p>
                    <p className="text-xs text-muted-foreground">Published</p>
                  </div>
                  <div className="border-l-2 border-muted-foreground/30 pl-3">
                    <p className="text-xl font-semibold">{draftBlogs.length}</p>
                    <p className="text-xs text-muted-foreground">Drafts waiting</p>
                  </div>
                  <div className="border-l-2 border-primary/50 pl-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-primary" />
                      <p className="text-xl font-semibold">{totalViews.toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Total views</p>
                  </div>
                </div>
                <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto border-t pt-4 pr-1">
                  {blogs.map((blog) => (
                    <Link
                      key={blog.id}
                      href={`${ADMIN_BASE_PATH}/blogs/edit/${blog.id}`}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{blog.title}</p>
                        <p className="text-xs text-muted-foreground">{blog.views.toLocaleString()} views</p>
                      </div>
                      <Badge variant={blog.status === "published" ? "default" : "secondary"}>{blog.status}</Badge>
                    </Link>
                  ))}
                  {!blogs.length ? <p className="text-sm text-muted-foreground">No blog posts yet.</p> : null}
                </div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-7">
              <CardHeader>
                <CardTitle>Activity</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Compare expense and group creation counts over time.
                </p>
              </CardHeader>
              <CardContent>
                <DashboardExpenseActivityChart events={dashboard.activityEvents} />
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-foreground">New groups</h3>
                <p className="mt-1 text-sm text-muted-foreground">The 10 groups with the latest activity.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`${ADMIN_BASE_PATH}/groups`}>View all</Link>
              </Button>
            </div>

            {dashboard.recentGroups.length ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {dashboard.recentGroups.map((group) => (
                  <Link key={group.id} href={`${ADMIN_BASE_PATH}/group/${group.id}`}>
                    <Card hover className="h-full">
                      <CardHeader>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted">
                          <ReceiptIcon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="mt-3 truncate">{group.name}</CardTitle>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Created {formatDisplayDateTime(group.created_at)}</p>
                          <p>Updated {formatDisplayDateTime(group.updated_at ?? group.created_at)}</p>
                          <p>Latest activity {formatDisplayDateTime(group.latestActivityAt)}</p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end justify-between gap-4">
                          <AvatarGroup names={group.members} showBelow />
                          <div className="text-right">
                            <p className="text-lg font-semibold text-foreground">
                              {formatCurrency(group.total, group.currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-sm text-muted-foreground">No groups yet.</CardContent>
              </Card>
            )}
          </section>
        </div>
      </AdminShell>
    </AdminGate>
  );
}
