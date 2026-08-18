import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Building2, Lightbulb, Quote } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";

import { BlogFaqSection } from "@/components/blog/BlogFaqSection";
import { BlogFloatingTableOfContents } from "@/components/blog/BlogFloatingTableOfContents";
import { BlogTableOfContents } from "@/components/blog/BlogTableOfContents";
import { extractBlogContentHeading } from "@/lib/blog/content-heading";
import { getBlogFaqDescription, parseBlogFaq } from "@/lib/blog/faq";
import { remarkInsight } from "@/lib/blog/remarkInsight";
import { remarkQuote } from "@/lib/blog/remarkQuote";
import { buildBlogTableOfContents } from "@/lib/blog/toc";
import type { Blog } from "@/lib/blog/types";

type HeadingProps = {
  children?: ReactNode;
  id?: string;
};

function BlogMarkdown({ content, headingOffset = 0 }: { content: string; headingOffset?: number }) {
  let renderedHeadingIndex = headingOffset;
  const renderHeading = (
    Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6",
    { children, id, ...props }: HeadingProps & ComponentPropsWithoutRef<"h1">
  ) => {
    renderedHeadingIndex += 1;
    return (
      <Tag id={id ?? `section-${renderedHeadingIndex}`} {...props}>
        {children}
      </Tag>
    );
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkDirective, remarkInsight, remarkQuote]}
      rehypePlugins={[rehypeRaw]}
      components={{
        h1: (props) => renderHeading("h1", props),
        h2: (props) => renderHeading("h2", props),
        h3: (props) => renderHeading("h3", props),
        h4: (props) => renderHeading("h4", props),
        h5: (props) => renderHeading("h5", props),
        h6: (props) => renderHeading("h6", props),
        table({ node: _node, ...props }) {
          return (
            <div className="blog-table-scroll" role="region" aria-label="Scrollable table" tabIndex={0}>
              <table {...props} />
            </div>
          );
        },
        aside({ children, className }) {
          if (!className?.includes("blog-insight")) {
            return <aside className={className}>{children}</aside>;
          }

          return (
            <aside className="blog-insight">
              <div className="blog-insight-heading">
                <span className="blog-insight-icon">
                  <Lightbulb aria-hidden="true" />
                </span>
                <span>Insight</span>
              </div>
              <div className="blog-insight-content">{children}</div>
            </aside>
          );
        },
        blockquote({ children, className }) {
          if (!className?.includes("blog-quote")) {
            return <blockquote className={className}>{children}</blockquote>;
          }

          return (
            <blockquote className="blog-quote">
              <Quote className="blog-quote-mark" aria-hidden="true" />
              <div className="blog-quote-content">{children}</div>
              <Building2 className="blog-quote-watermark" aria-hidden="true" />
            </blockquote>
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
      {content}
    </ReactMarkdown>
  );
}

export function BlogArticle({ blog }: { blog: Blog }) {
  const { content } = extractBlogContentHeading(blog.content);
  const headings = buildBlogTableOfContents(content);
  const faq = parseBlogFaq(content);

  return (
    <>
      <BlogFloatingTableOfContents headings={headings} />
      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
        <aside className="blog-outline hidden lg:block lg:top-[6rem] lg:self-start lg:pr-1 mt-[17px]">
          <div className="border-r border-border pr-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              On this page
            </p>
            <div className="h-px w-10 bg-primary" />
            <div className="mt-3">
              <BlogTableOfContents headings={headings} />
            </div>
          </div>
        </aside>
        <article className="blog-article-content blog-detail-content w-full min-w-0 max-w-[800px]">
          {faq ? (
            <>
              <BlogMarkdown content={faq.before} />
              <BlogFaqSection
                title={faq.title}
                description={getBlogFaqDescription(blog.title)}
                intro={faq.intro}
                headingId={`section-${faq.headingIndex}`}
                items={faq.items}
              />
              {faq.after ? (
                <BlogMarkdown
                  content={faq.after}
                  headingOffset={faq.afterHeadingOffset}
                />
              ) : null}
            </>
          ) : (
            <BlogMarkdown content={content} />
          )}
        </article>
      </div>
    </>
  );
}
