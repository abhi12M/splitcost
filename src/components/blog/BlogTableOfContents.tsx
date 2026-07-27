import type { BlogTocItem } from "@/lib/blog/toc";

type BlogTableOfContentsProps = {
  headings: BlogTocItem[];
};

function getTocItemClassName(level: number) {
  if (level <= 1) return "block font-medium hover:text-foreground";
  if (level === 2) return "block pl-3 hover:text-foreground";
  if (level === 3) return "block pl-6 text-xs hover:text-foreground";
  if (level === 4) return "block pl-8 text-xs hover:text-foreground";
  if (level === 5) return "block pl-10 text-xs hover:text-foreground";
  return "block pl-12 text-xs hover:text-foreground";
}

export function BlogTableOfContents({ headings }: BlogTableOfContentsProps) {
  return (
    <>
      <p className="text-sm font-semibold">Table of contents</p>
      {headings.length ? (
        <nav className="space-y-2 text-sm text-muted-foreground">
          {headings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={getTocItemClassName(heading.level)}
            >
              {heading.text}
            </a>
          ))}
        </nav>
      ) : (
        <p className="text-sm text-muted-foreground">Article overview</p>
      )}
    </>
  );
}
