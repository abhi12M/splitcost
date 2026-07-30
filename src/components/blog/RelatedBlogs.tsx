import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Blog } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/utils";
import { cn } from "@/lib/utils";

export function RelatedBlogs({ blogs }: { blogs: Blog[] }) {
  if (!blogs.length) return null;

  return (
    <section
      className="bg-background pb-12 pt-2 md:pb-16"
      aria-labelledby="related-blogs-title"
    >
      <div className="container max-w-[1180px]">
        <div className="mb-4 flex items-center justify-between gap-5">
          <h2 id="related-blogs-title" className="text-xl font-bold text-foreground">
            Related guides
          </h2>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/blog">
              View all
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2",
            blogs.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
          )}
        >
          {blogs.map((blog) => (
            <Link
              key={blog.id}
              href={`/blog/${blog.slug}`}
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
            >
              <div className="aspect-[2/1] overflow-hidden bg-primary/5">
                {blog.cover_image ? (
                  <img
                    src={blog.cover_image}
                    alt={blog.cover_alt || blog.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold text-primary">
                    SplitCost
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-sm font-bold leading-5 text-foreground group-hover:text-primary">
                  {blog.title}
                </h3>
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                  <span>{formatBlogDate(blog.published_at)}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-primary">
                    {blog.reading_time} min
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <Button asChild variant="outline" size="sm" className="mt-4 w-full sm:hidden">
          <Link href="/blog">
            View all guides
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
