"use client";

import { BlogArticle } from "@/components/blog/BlogArticle";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Blog } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/utils";

type BlogPreviewDialogProps = {
  blog: Blog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BlogPreviewDialog({ blog, open, onOpenChange }: BlogPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100vh-2rem)] max-w-6xl overflow-y-auto p-0 sm:rounded-xl">
        <article>
          <section className="border-b bg-muted/30 px-6 py-8 md:px-10 md:py-12">
            <div className="mx-auto max-w-4xl space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  Draft preview
                </Badge>
                {blog.category ? <Badge>{blog.category}</Badge> : null}
                <span>{formatBlogDate(blog.published_at)}</span>
                <span>{blog.reading_time} min read</span>
                <span>By {blog.author}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">{blog.title}</h1>
              <p className="text-lg leading-8 text-muted-foreground">{blog.excerpt}</p>
            </div>
          </section>
          <section className="px-6 pb-10 pt-8 md:px-10">
            <div className="relative mx-auto aspect-[16/8] max-w-5xl overflow-hidden rounded-lg bg-muted">
              {blog.cover_image ? (
                <img src={blog.cover_image} alt={blog.cover_alt || blog.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-primary-muted text-primary">SplitCost Blog</div>
              )}
            </div>
          </section>
          <section className="px-6 pb-12 md:px-10">
            <div className="mx-auto max-w-6xl">
              <BlogArticle blog={blog} />
            </div>
          </section>
        </article>
      </DialogContent>
    </Dialog>
  );
}
