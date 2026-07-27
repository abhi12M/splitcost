"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileText, Plus, Users } from "lucide-react";

import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getBlogCategoryTitle } from "@/lib/blog/categories";
import type { BlogListItem } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/utils";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import type { GroupOverviewItemInterface } from "@/lib/storage";

type BlogStats = {
  total: number;
  published: number;
  drafts: number;
  recent: BlogListItem[];
};

type DashboardState = {
  groupCount: number;
  recentGroups: GroupOverviewItemInterface[];
  blogs: BlogStats;
};

export function AdminDashboard() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [groupsRes, blogsRes] = await Promise.all([
          fetch("/api/groups"),
          fetch("/api/blogs?status=all&pageSize=5&sort=latest"),
        ]);

        const groupsPayload = await groupsRes.json();
        const blogsPayload = await blogsRes.json();

        if (!groupsRes.ok) {
          throw new Error(groupsPayload.error || "Failed to load groups");
        }
        if (!blogsRes.ok) {
          throw new Error(blogsPayload.error || "Failed to load blogs");
        }

        const groups = Array.isArray(groupsPayload) ? groupsPayload : [];
        const items: BlogListItem[] = blogsPayload.items ?? [];
        const published = items.filter((item) => item.status === "published").length;
        // For accurate counts, fetch count-only style by using totals when available
        // and a second lightweight request for drafts/published if needed.
        const [publishedRes, draftRes] = await Promise.all([
          fetch("/api/blogs?status=published&pageSize=1"),
          fetch("/api/blogs?status=draft&pageSize=1"),
        ]);
        const publishedPayload = await publishedRes.json();
        const draftPayload = await draftRes.json();

        if (cancelled) return;

        setState({
          groupCount: groups.length,
          recentGroups: groups.slice(0, 5),
          blogs: {
            total: blogsPayload.total ?? items.length,
            published: publishedPayload.total ?? published,
            drafts: draftPayload.total ?? Math.max(0, (blogsPayload.total ?? 0) - published),
            recent: items.slice(0, 5),
          },
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AdminShell
      title="Dashboard"
      description="Overview of groups and blog content."
      actions={
        <Button asChild>
          <Link href={`${ADMIN_BASE_PATH}/blogs/new`}>
            <Plus className="mr-2 h-4 w-4" />
            Quick create blog
          </Link>
        </Button>
      }
    >
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : state ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total groups"
              value={state.groupCount}
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              title="Total blogs"
              value={state.blogs.total}
              icon={<FileText className="h-4 w-4" />}
            />
            <StatCard title="Published blogs" value={state.blogs.published} />
            <StatCard title="Draft blogs" value={state.blogs.drafts} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent groups</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href={`${ADMIN_BASE_PATH}/groups`}>View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {state.recentGroups.length ? (
                  state.recentGroups.map((group) => (
                    <Link
                      key={group.id}
                      href={`${ADMIN_BASE_PATH}/group/${group.id}`}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/50"
                    >
                      <span className="font-medium">{group.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {group.currency}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No groups yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent blog posts</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href={`${ADMIN_BASE_PATH}/blogs`}>View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {state.blogs.recent.length ? (
                  state.blogs.recent.map((post) => (
                    <Link
                      key={post.id}
                      href={`${ADMIN_BASE_PATH}/blogs/edit/${post.id}`}
                      className="block rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{post.title}</span>
                        <Badge
                          variant={
                            post.status === "published" ? "default" : "secondary"
                          }
                        >
                          {post.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {getBlogCategoryTitle(post.category)} ·{" "}
                        {formatBlogDate(post.updated_at)}
                      </p>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No blogs yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
