"use client";

import { BlogArticle } from "@/components/blog/BlogArticle";
import { BlogArticleHeader } from "@/components/blog/BlogArticleHeader";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Blog } from "@/lib/blog/types";

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
          <BlogArticleHeader blog={blog} draftPreview />
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
