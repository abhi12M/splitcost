"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import type { Blog } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/utils";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function BlogAdminList({ blogs }: { blogs: Blog[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this blog post?")) return;
    setDeletingId(id);
    await fetch(`/api/blogs/${id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
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
                  <TableCell>
                    <Badge variant={blog.status === "published" ? "default" : "secondary"}>
                      {blog.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{blog.category}</TableCell>
                  <TableCell>{formatBlogDate(blog.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild size="icon" variant="outline" aria-label="Edit blog">
                        <Link href={`${ADMIN_BASE_PATH}/blogs/edit/${blog.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label="Delete blog"
                        disabled={deletingId === blog.id}
                        onClick={() => void handleDelete(blog.id)}
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
    </Card>
  );
}
