import Link from "next/link";
import { Facebook, Linkedin, Mail, Twitter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCanonicalUrl } from "@/lib/seo";
import type { Blog } from "@/lib/blog/types";
import { stripHtml } from "@/lib/blog/utils";

function getHeadings(content: string) {
  const matches = [...content.matchAll(/<h([2-3])[^>]*>(.*?)<\/h\1>/gi)];
  return matches.map((match, index) => {
    const text = stripHtml(match[2]);
    return {
      id: `section-${index + 1}`,
      text,
      level: Number(match[1]),
    };
  });
}

function withHeadingIds(content: string) {
  let index = 0;
  return content.replace(/<h([2-3])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, text) => {
    index += 1;
    if (attrs.includes("id=")) return match;
    return `<h${level}${attrs} id="section-${index}">${text}</h${level}>`;
  });
}

export function BlogArticle({ blog }: { blog: Blog }) {
  const url = getCanonicalUrl(`/en/blog/${blog.slug}`);
  const headings = getHeadings(blog.content);
  const shareText = encodeURIComponent(blog.title);
  const shareUrl = encodeURIComponent(url);

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold">Table of contents</p>
          {headings.length ? (
            <nav className="space-y-2 text-sm text-muted-foreground">
              {headings.map((heading) => (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  className={heading.level === 3 ? "block pl-3 hover:text-foreground" : "block hover:text-foreground"}
                >
                  {heading.text}
                </a>
              ))}
            </nav>
          ) : (
            <p className="text-sm text-muted-foreground">Article overview</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button asChild size="icon" variant="outline" aria-label="Share on X">
              <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noreferrer">
                <Twitter className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="icon" variant="outline" aria-label="Share on Facebook">
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noreferrer">
                <Facebook className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="icon" variant="outline" aria-label="Share on LinkedIn">
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noreferrer">
                <Linkedin className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild size="icon" variant="outline" aria-label="Share by email">
              <a href={`mailto:?subject=${shareText}&body=${shareUrl}`}>
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </aside>
      <article
        className="blog-article-content prose prose-slate max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-a:text-primary prose-img:rounded-lg"
        dangerouslySetInnerHTML={{ __html: withHeadingIds(blog.content) }}
      />
    </div>
  );
}
