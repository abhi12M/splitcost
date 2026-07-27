"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getBlogCategoryTitle } from "@/lib/blog/categories";
import type { BlogListItem, BlogListResult } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/utils";
import { ADMIN_BASE_PATH } from "@/lib/constants";

export function BlogAdminList() {
  const [data, setData] = useState<BlogListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        "/api/blogs?status=all&pageSize=50&sort=latest"
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Failed to load blogs");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async (post: BlogListItem) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) {
      return;
    }
    setDeletingId(post.id);
    try {
      const response = await fetch(`/api/blogs/${post.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Delete failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!data?.items.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">No blog posts yet.</p>
        <Button asChild className="mt-4">
          <Link href={`${ADMIN_BASE_PATH}/blogs/new`}>Create your first blog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">Created</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((post) => (
            <tr key={post.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{post.title}</div>
                <div className="text-xs text-muted-foreground">/{post.slug}</div>
                {post.nofollow ? (
                  <Badge variant="outline" className="mt-1">
                    nofollow
                  </Badge>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <Badge
                  variant={post.status === "published" ? "default" : "secondary"}
                >
                  {post.status}
                </Badge>
              </td>
              <td className="px-4 py-3">{getBlogCategoryTitle(post.category)}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatBlogDate(post.created_at)}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`${ADMIN_BASE_PATH}/blogs/edit/${post.id}`}>
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deletingId === post.id}
                    onClick={() => void handleDelete(post)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
