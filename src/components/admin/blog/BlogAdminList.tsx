"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit, Plus, Trash2 } from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";

import type { BlogAdminListItem } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/utils";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatViewCount(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function BlogStatusBadges({ blog }: { blog: BlogAdminListItem }) {
  if (blog.status === "published" && blog.has_draft_changes) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <Badge>Published</Badge>
        {blog.is_featured ? <Badge variant="outline">Featured</Badge> : null}
        <Badge variant="secondary">Draft changes</Badge>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={blog.status === "published" ? "default" : "secondary"}>
        {blog.status === "published" ? "Published" : "Draft"}
      </Badge>
      {blog.is_featured ? <Badge variant="outline">Featured</Badge> : null}
    </div>
  );
}

export function BlogAdminList({ blogs }: { blogs: BlogAdminListItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogAdminListItem | null>(null);

  useEffect(() => {
    // Browser Back can restore this route from Next.js' client cache after a
    // publish redirects to the public article. Refresh its server data whenever
    // the list becomes active again.
    const refreshList = () => router.refresh();
    refreshList();
    window.addEventListener("pageshow", refreshList);
    return () => window.removeEventListener("pageshow", refreshList);
  }, [router]);

  const handleEdit = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    // Avoid opening a prefetched editor payload that predates the last autosave.
    router.push(`${ADMIN_BASE_PATH}/blogs/edit/${id}?updated=${Date.now()}`);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/blogs/${id}`, { method: "DELETE" });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error ?? "Failed to delete blog post");
      }

      toast({ title: "Blog post deleted" });
      router.refresh();
    } catch (error) {
      toast({
        title: "Unable to delete blog post",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Blog posts</CardTitle>
        <Button asChild>
          <Link href={`${ADMIN_BASE_PATH}/blogs/new`}>
            <Plus className="h-4 w-4" />
            Create blog
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {blogs.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blogs.map((blog) => (
                <TableRow key={blog.id}>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="font-medium">{blog.title}</p>
                      <p className="truncate text-xs text-muted-foreground">/{blog.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell><BlogStatusBadges blog={blog} /></TableCell>
                  <TableCell>{blog.category ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatViewCount(blog.views)}</TableCell>
                  <TableCell>{formatBlogDate(blog.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild size="icon" variant="outline" aria-label="Edit blog">
                        <Link
                          href={`${ADMIN_BASE_PATH}/blogs/edit/${blog.id}`}
                          prefetch={false}
                          onClick={(event) => handleEdit(event, blog.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="Delete blog"
                        disabled={deletingId === blog.id}
                        onClick={() => setDeleteTarget(blog)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium">No blog posts yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first article to start publishing.
            </p>
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete blog post?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Delete "${deleteTarget.title}". This permanently deletes the blog post.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deleteTarget) void handleDelete(deleteTarget.id);
              }}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
