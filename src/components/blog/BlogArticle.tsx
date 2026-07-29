import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { ChevronDown, List } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { BlogTableOfContents } from "@/components/blog/BlogTableOfContents";
import { buildBlogTableOfContents } from "@/lib/blog/toc";
import type { Blog } from "@/lib/blog/types";

type HeadingProps = {
  children?: ReactNode;
  id?: string;
};

export function BlogArticle({ blog }: { blog: Blog }) {
  const headings = buildBlogTableOfContents(blog.content);
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
    <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
      <aside className="blog-outline lg:top-[6rem] lg:self-start lg:pr-1">
        <div className="hidden border-r border-border pr-6 lg:block">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">On this page</p>
          <div className="h-px w-10 bg-primary" />
          <div className="mt-3"><BlogTableOfContents headings={headings} /></div>
        </div>
        <details className="rounded-lg border border-border bg-card lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-foreground">
            <span className="flex items-center gap-2"><List className="h-4 w-4 text-primary" /> On this page</span><ChevronDown className="h-4 w-4" />
          </summary>
          <div className="border-t border-border px-4 py-3"><BlogTableOfContents headings={headings} /></div>
        </details>
      </aside>
      <article className="blog-article-content blog-detail-content max-w-[800px]">
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
