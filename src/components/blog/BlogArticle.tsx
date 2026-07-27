import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Facebook, Linkedin, Mail, Twitter } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { BlogTableOfContents } from "@/components/blog/BlogTableOfContents";
import { Button } from "@/components/ui/button";
import { getCanonicalUrl } from "@/lib/seo";
import { buildBlogTableOfContents } from "@/lib/blog/toc";
import type { Blog } from "@/lib/blog/types";

type HeadingProps = {
  children?: ReactNode;
  id?: string;
};

export function BlogArticle({ blog }: { blog: Blog }) {
  const url = getCanonicalUrl(`/en/blog/${blog.slug}`);
  const headings = buildBlogTableOfContents(blog.content);
  const shareText = encodeURIComponent(blog.title);
  const shareUrl = encodeURIComponent(url);
  let renderedHeadingIndex = 0;

  const renderHeading = (
    Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
    { children, id, ...props }: HeadingProps & ComponentPropsWithoutRef<"h1">
  ) => {
    const tocId = headings[renderedHeadingIndex]?.id;
    renderedHeadingIndex += 1;
    return (
      <Tag id={id ?? tocId ?? `section-${renderedHeadingIndex}`} {...props}>
        {children}
      </Tag>
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <BlogTableOfContents headings={headings} />
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
            h1: (props) => renderHeading("h1", props),
            h2: (props) => renderHeading("h2", props),
            h3: (props) => renderHeading("h3", props),
            h4: (props) => renderHeading("h4", props),
            h5: (props) => renderHeading("h5", props),
            h6: (props) => renderHeading("h6", props),
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
