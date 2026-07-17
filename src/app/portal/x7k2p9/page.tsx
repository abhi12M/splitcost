import type { Metadata } from "next";
import Link from "next/link";
import { FileText, FolderKanban, Plus, Users } from "lucide-react";

import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAllBlogs } from "@/lib/blog/queries";
import { formatBlogDate } from "@/lib/blog/utils";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { buildMetadata } from "@/lib/seo";
import { supabaseAdmin } from "@/lib/supabase/server";

type RecentGroup = {
  id: string;
  name: string;
  currency: string;
  created_at: string;
};

export const metadata: Metadata = buildMetadata({
  title: "Admin",
  description: "Administrative dashboard for SplitCost.",
  path: ADMIN_BASE_PATH,
  noIndex: true,
});

export const dynamic = "force-dynamic";

async function getRecentGroups() {
  const { data } = await supabaseAdmin
    .from("groups")
    .select("id,name,currency,created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  return data ?? [];
}

async function getGroupCount() {
  const { count } = await supabaseAdmin
    .from("groups")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function Page() {
  const [blogs, recentGroups, totalGroups] = await Promise.all([
    listAllBlogs(),
    getRecentGroups(),
    getGroupCount(),
  ]);
  const publishedBlogs = blogs.filter((blog) => blog.status === "published");
  const draftBlogs = blogs.filter((blog) => blog.status === "draft");

  return (
    <AdminGate>
      <AdminShell>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalGroups}</p>
                <p className="text-sm text-muted-foreground">Total Groups</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{blogs.length}</p>
                <p className="text-sm text-muted-foreground">Total Blogs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <FolderKanban className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{publishedBlogs.length}</p>
                <p className="text-sm text-muted-foreground">Published Blogs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{draftBlogs.length}</p>
                <p className="text-sm text-muted-foreground">Draft Blogs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Groups</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href={`${ADMIN_BASE_PATH}/groups`}>View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentGroups.length ? (
                (recentGroups as RecentGroup[]).map((group) => (
                  <div key={group.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium">{group.name}</p>
                      <p className="text-sm text-muted-foreground">{group.currency}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatBlogDate(group.created_at)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No groups yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Blog Posts</CardTitle>
              <Button asChild size="sm">
                <Link href={`${ADMIN_BASE_PATH}/blogs/new`}>
                  <Plus className="h-4 w-4" />
                  Quick Create Blog
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {blogs.slice(0, 5).map((blog) => (
                <div key={blog.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{blog.title}</p>
                    <p className="text-sm text-muted-foreground">{blog.category}</p>
                  </div>
                  <Badge variant={blog.status === "published" ? "default" : "secondary"}>
                    {blog.status}
                  </Badge>
                </div>
              ))}
              {!blogs.length ? <p className="text-sm text-muted-foreground">No blogs yet.</p> : null}
            </CardContent>
          </Card>
        </div>
      </AdminShell>
    </AdminGate>
  );
}
