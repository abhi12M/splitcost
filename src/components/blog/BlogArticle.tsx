"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  Facebook,
  Linkedin,
  Link2,
  Twitter,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { getBlogCategoryTitle } from "@/lib/blog/categories";
import type { BlogListItem, BlogPost } from "@/lib/blog/types";
import {
  extractHeadings,
  formatBlogDate,
  injectHeadingIds,
} from "@/lib/blog/utils";
import { getAvatarColor, getInitials } from "@/lib/avatar-utils";
import { getLocalizedCanonicalUrl } from "@/lib/seo-i18n";
import { Button } from "@/components/ui/button";
import { BlogCard } from "@/components/blog/BlogCard";
import { cn } from "@/lib/utils";

type BlogArticleProps = {
  post: BlogPost;
  previous: BlogListItem | null;
  next: BlogListItem | null;
  related: BlogListItem[];
};

export function BlogArticle({
  post,
  previous,
  next,
  related,
}: BlogArticleProps) {
  const content = useMemo(() => injectHeadingIds(post.content), [post.content]);
  const headings = useMemo(() => extractHeadings(content), [content]);
  const [activeId, setActiveId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const shareUrl = getLocalizedCanonicalUrl("en", `/blog/${post.slug}`);
  const avatarColor = getAvatarColor(post.author);

  useEffect(() => {
    void fetch(`/api/blogs/${post.id}/view`, { method: "POST" }).catch(() => undefined);
  }, [post.id]);

  useEffect(() => {
    if (!headings.length) return;

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  const shareLinks = [
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(post.title)}`,
      icon: Twitter,
    },
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      icon: Facebook,
    },
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      icon: Linkedin,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="pb-16">
      <div className="relative overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_40%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.45))]">
        <div className="container max-w-5xl py-10 md:py-14">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/blog" className="hover:text-foreground">
                  Blog
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link
                  href={`/blog/category/${post.category}`}
                  className="hover:text-foreground"
                >
                  {getBlogCategoryTitle(post.category)}
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-foreground" aria-current="page">
                {post.title}
              </li>
            </ol>
          </nav>

          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            {getBlogCategoryTitle(post.category)}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-foreground md:text-5xl md:leading-tight">
            {post.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              {post.author_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.author_avatar}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold"
                  style={{
                    backgroundColor: `hsl(${avatarColor.bg})`,
                    color: `hsl(${avatarColor.fg})`,
                  }}
                  aria-hidden
                >
                  {getInitials(post.author)}
                </span>
              )}
              <div>
                <p className="font-medium text-foreground">{post.author}</p>
                <p className="text-sm text-muted-foreground">
                  Published {formatBlogDate(post.published_at)}
                  {post.updated_at &&
                  post.published_at &&
                  post.updated_at.slice(0, 10) !== post.published_at.slice(0, 10)
                    ? ` · Updated ${formatBlogDate(post.updated_at)}`
                    : ""}
                  {` · ${post.reading_time} min read`}
                </p>
              </div>
            </div>
          </div>

          <ShareRow
            shareLinks={shareLinks}
            onCopy={copyLink}
            copied={copied}
            className="mt-6"
          />
        </div>
      </div>

      {post.cover_image ? (
        <div className="container max-w-5xl pt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.cover_image}
            alt={post.cover_image_alt || post.title}
            className="w-full rounded-2xl border border-border object-cover shadow-sm"
          />
        </div>
      ) : null}

      <div className="container max-w-5xl py-10">
        <div
          className={cn(
            "grid gap-10",
            headings.length ? "lg:grid-cols-[220px_minmax(0,1fr)]" : ""
          )}
        >
          {headings.length ? (
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  On this page
                </p>
                <nav aria-label="Table of contents">
                  <ul className="space-y-2 border-l border-border">
                    {headings.map((heading) => (
                      <li key={heading.id}>
                        <a
                          href={`#${heading.id}`}
                          className={cn(
                            "block border-l-2 py-1 pl-3 text-sm transition-colors",
                            heading.level === 3 ? "pl-5" : "",
                            activeId === heading.id
                              ? "border-primary text-primary"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {heading.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </aside>
          ) : null}

          <div
            className="blog-prose prose prose-slate max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-a:text-primary prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        {post.faqs && post.faqs.length > 0 ? (
          <section className="mt-14 rounded-2xl border border-border bg-muted/30 p-6">
            <h2 className="text-2xl font-semibold tracking-tight">FAQs</h2>
            <div className="mt-4 space-y-4">
              {post.faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="text-lg font-medium">{faq.question}</h3>
                  <p className="mt-1 text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-12 grid gap-4 border-y border-border py-8 sm:grid-cols-2">
          {previous ? (
            <Link
              href={`/blog/${previous.slug}`}
              className="rounded-xl border border-border p-4 transition-colors hover:bg-muted/40"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Previous
              </p>
              <p className="mt-1 font-semibold text-foreground">{previous.title}</p>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={`/blog/${next.slug}`}
              className="rounded-xl border border-border p-4 text-right transition-colors hover:bg-muted/40"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Next
              </p>
              <p className="mt-1 font-semibold text-foreground">{next.title}</p>
            </Link>
          ) : null}
        </div>

        <ShareRow
          shareLinks={shareLinks}
          onCopy={copyLink}
          copied={copied}
          className="mt-8"
        />

        {related.length ? (
          <section className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight">Related articles</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <BlogCard key={item.id} post={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-24 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:bottom-8"
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
    </article>
  );
}

function ShareRow({
  shareLinks,
  onCopy,
  copied,
  className,
}: {
  shareLinks: {
    label: string;
    href: string;
    icon: typeof Twitter;
  }[];
  onCopy: () => void;
  copied: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {shareLinks.map((item) => {
        const Icon = item.icon;
        return (
          <Button key={item.label} asChild variant="outline" size="sm">
            <a href={item.href} target="_blank" rel="noopener noreferrer">
              <Icon className="mr-2 h-4 w-4" />
              {item.label.replace("Share on ", "")}
            </a>
          </Button>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={onCopy}>
        <Link2 className="mr-2 h-4 w-4" />
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
