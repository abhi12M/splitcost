import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatBlogDate } from "@/lib/blog/utils";
import type { Blog } from "@/lib/blog/types";

export function BlogCard({ blog }: { blog: Blog }) {
  return (
    <Link className="block h-full" href={`/en/blog/${blog.slug}`}>
      <Card hover className="h-full overflow-hidden">
        <div className="relative aspect-[16/9] bg-muted">
          {blog.cover_image ? (
            <img
              src={blog.cover_image}
              alt={blog.cover_alt || blog.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-primary-muted text-sm font-medium text-primary">
              SplitCost
            </div>
          )}
        </div>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{blog.category}</Badge>
            <span>{formatBlogDate(blog.published_at)}</span>
            <span>{blog.reading_time} min read</span>
          </div>
          <div className="space-y-2">
            <h2 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground">
              {blog.title}
            </h2>
            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
              {blog.excerpt}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
