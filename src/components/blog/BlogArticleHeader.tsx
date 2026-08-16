import { Badge } from "@/components/ui/badge";
import type { Blog } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/utils";

type BlogArticleHeaderProps = {
  blog: Blog;
  draftPreview?: boolean;
};

export function BlogArticleHeader({ blog, draftPreview = false }: BlogArticleHeaderProps) {
  return (
    <>
      <section className="border-b bg-muted/30 px-6 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-4xl space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {draftPreview ? (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                Draft preview
              </Badge>
            ) : null}
            {blog.category ? <Badge>{blog.category}</Badge> : null}
            <span>{formatBlogDate(blog.published_at)}</span>
            <span>{blog.reading_time} min read</span>
            <span>By {blog.author}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            {blog.title}
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">{blog.excerpt}</p>
        </div>
      </section>
      <section className="px-6 pb-10 pt-8 md:px-10">
        <div className="relative mx-auto aspect-[16/8] max-w-5xl overflow-hidden rounded-lg bg-muted">
          {blog.cover_image ? (
            <img
              src={blog.cover_image}
              alt={blog.cover_alt || blog.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-primary-muted text-primary">
              SplitCost Blog
            </div>
          )}
        </div>
      </section>
    </>
  );
}
