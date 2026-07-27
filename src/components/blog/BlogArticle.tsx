import { Facebook, Linkedin, Mail, Twitter } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { getCanonicalUrl } from "@/lib/seo";
import type { Blog } from "@/lib/blog/types";
import { stripHtml } from "@/lib/blog/utils";

function getHeadings(content: string) {
  const headings: Array<{ id: string; text: string; level: number }> = [];
  let index = 0;

  content.replace(/<h([1-3])([^>]*)>(.*?)<\/h\1>/gi, (_match, level, attrs, text) => {
    index += 1;
    const existingId = String(attrs).match(/\sid=["']([^"']+)["']/i)?.[1];
    headings.push({
      id: existingId ?? `section-${index}`,
      text: stripHtml(text),
      level: Number(level),
    });
    return "";
  });

  if (headings.length) return headings;

  for (const match of content.matchAll(/^(#{1,3})\s+(.+)$/gm)) {
    index += 1;
    headings.push({
      id: `section-${index}`,
      text: stripHtml(match[2]),
      level: match[1].length,
    });
  }

  return headings;
}

export function BlogArticle({ blog }: { blog: Blog }) {
  const url = getCanonicalUrl(`/en/blog/${blog.slug}`);
  const headings = getHeadings(blog.content);
  const shareText = encodeURIComponent(blog.title);
  const shareUrl = encodeURIComponent(url);
  let renderedHeadingIndex = 0;

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
      <article className="blog-article-content prose prose-slate max-w-none dark:prose-invert prose-headings:scroll-mt-28 prose-a:text-primary prose-img:rounded-lg">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            h2({ children, id, ...props }) {
              renderedHeadingIndex += 1;
              return (
                <h2 id={id ?? `section-${renderedHeadingIndex}`} {...props}>
                  {children}
                </h2>
              );
            },
            h3({ children, id, ...props }) {
              renderedHeadingIndex += 1;
              return (
                <h3 id={id ?? `section-${renderedHeadingIndex}`} {...props}>
                  {children}
                </h3>
              );
            },
            h1({ children, id, ...props }) {
              renderedHeadingIndex += 1;
              return (
                <h1 id={id ?? `section-${renderedHeadingIndex}`} {...props}>
                  {children}
                </h1>
              );
            },
            a({ children, href, ...props }) {
              const isExternal = href?.startsWith("http");
              return isExternal ? (
                <a href={href} target="_blank" rel="noreferrer" {...props}>
                  {children}
                </a>
              ) : (
                <a href={href} {...props}>
                  {children}
                </a>
              );
            },
          }}
        >
          {blog.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
