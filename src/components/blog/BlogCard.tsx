"use client";

import { Clock } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getBlogCategoryTitle } from "@/lib/blog/categories";
import type { BlogListItem } from "@/lib/blog/types";
import { formatBlogDate } from "@/lib/blog/utils";
import { getAvatarColor, getInitials } from "@/lib/avatar-utils";
import { cn } from "@/lib/utils";

type BlogCardProps = {
  post: BlogListItem;
  className?: string;
};

export function BlogCard({ post, className }: BlogCardProps) {
  const avatarColor = getAvatarColor(post.author);

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card transition-shadow hover:shadow-md",
        className
      )}
    >
      <Link href={`/blog/${post.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-muted">
        {post.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image}
            alt={post.cover_image_alt || post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 text-sm text-muted-foreground">
            SplitCost Blog
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={`/blog/category/${post.category}`}
            className="font-medium text-primary hover:underline"
          >
            {getBlogCategoryTitle(post.category)}
          </Link>
          <span aria-hidden>·</span>
          <time dateTime={post.published_at ?? post.created_at}>
            {formatBlogDate(post.published_at ?? post.created_at)}
          </time>
        </div>

        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          <Link
            href={`/blog/${post.slug}`}
            className="transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {post.title}
          </Link>
        </h2>

        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {post.excerpt}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            {post.author_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.author_avatar}
                alt=""
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: `hsl(${avatarColor.bg})`,
                  color: `hsl(${avatarColor.fg})`,
                }}
                aria-hidden
              >
                {getInitials(post.author)}
              </span>
            )}
            <span className="text-sm text-foreground">{post.author}</span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {post.reading_time} min
          </span>
        </div>
      </div>
    </article>
  );
}
