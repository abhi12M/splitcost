import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { extractBlogContentHeading } from "@/lib/blog/content-heading";
import type { Blog } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/utils";

type BlogArticleHeaderProps = {
  blog: Blog;
  draftPreview?: boolean;
  showBreadcrumb?: boolean;
};

export function BlogArticleHeader({
  blog,
  draftPreview = false,
  showBreadcrumb = false,
}: BlogArticleHeaderProps) {
  const { h1 } = extractBlogContentHeading(blog.content);

  return (
    <>
      <section className="border-b bg-muted/30 px-6 py-8 md:px-10 md:py-12">
        <div className="mx-auto max-w-4xl space-y-5">
          {showBreadcrumb ? (
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground"
            >
              <Link href="/" className="transition-colors hover:text-primary hover:underline">
                Home
              </Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <Link href="/blog" className="transition-colors hover:text-primary hover:underline">
                Blog
              </Link>
              {blog.category ? (
                <>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <Link
                    href={`/blog?category=${encodeURIComponent(blog.category)}`}
                    className="truncate transition-colors hover:text-primary hover:underline"
                  >
                    {blog.category}
                  </Link>
                </>
              ) : null}
            </nav>
          ) : null}
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
            {h1 || blog.title}
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">{blog.excerpt}</p>
        </div>
      </section>
      <section className="px-6 pb-[20px] pt-8 md:px-10">
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
