import { ArrowRight, Clock3 } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { formatBlogDate } from "@/lib/blog/utils";
import type { Blog } from "@/lib/blog/types";

export function BlogCard({ blog }: { blog: Blog }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-card">
      <Link href={`/blog/${blog.slug}`} className="block overflow-hidden">
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/15 via-primary-muted to-muted">
          {blog.cover_image ? (
            <img
              src={blog.cover_image}
              alt={blog.cover_alt || blog.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-end p-4 text-3xl font-bold tracking-tight text-primary/25">
              SplitCost
            </div>
          )}
          <span className="absolute bottom-3 left-3 rounded-full bg-card/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary shadow-sm backdrop-blur">
            {blog.category || "Guide"}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock3 className="h-3.5 w-3.5" />
          <span>{blog.reading_time} min read</span>
          <span aria-hidden="true">·</span>
          <span>{formatBlogDate(blog.published_at)}</span>
        </div>
        <Link href={`/blog/${blog.slug}`}>
          <h2 className="line-clamp-2 text-base font-bold leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary">
            {blog.title}
          </h2>
        </Link>
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
          {blog.excerpt}
        </p>
        <Link
          href={`/blog/${blog.slug}`}
          className="mt-auto inline-flex items-center gap-1.5 pt-5 text-xs font-bold text-primary"
        >
          Read guide
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </article>
  );
}
