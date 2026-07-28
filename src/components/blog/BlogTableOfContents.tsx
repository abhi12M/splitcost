import { ListTree } from "lucide-react";

import type { BlogTocItem } from "@/lib/blog/toc";
import { cn } from "@/lib/utils";

type BlogTableOfContentsProps = {
  headings: BlogTocItem[];
  variant?: "default" | "sidebar";
  activeId?: string;
  onClose?: () => void;
  onHeadingClick?: (heading: BlogTocItem, index: number) => void;
};

function getTocItemClassName(level: number, variant: "default" | "sidebar", active: boolean) {
  const base =
    variant === "sidebar"
      ? "relative flex min-w-0 items-start rounded-md py-1.5 pr-2 text-[13px] leading-5 transition-colors"
      : "block hover:text-foreground";

  const activeClass =
    variant === "sidebar" && active
      ? "bg-primary/10 font-medium text-primary"
      : variant === "sidebar"
        ? "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        : "";

  if (variant === "default") {
    if (level <= 1) return cn(base, "font-medium hover:text-foreground");
    if (level === 2) return cn(base, "pl-3");
    if (level === 3) return cn(base, "pl-6 text-xs");
    if (level === 4) return cn(base, "pl-8 text-xs");
    if (level === 5) return cn(base, "pl-10 text-xs");
    return cn(base, "pl-12 text-xs");
  }

  if (level <= 1) return cn(base, "pl-2", activeClass);
  if (level === 2) return cn(base, "pl-4", activeClass);
  return cn(base, "pl-7 text-xs", activeClass);
}

export function BlogTableOfContents({
  headings,
  variant = "default",
  activeId,
  onClose,
  onHeadingClick,
}: BlogTableOfContentsProps) {
  if (variant === "sidebar") {
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="flex min-h-12 shrink-0 items-center gap-2 border-b px-3">
          <div className="flex min-w-0 items-center gap-2">
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Collapse table of contents"
              >
                <ListTree className="h-4 w-4" />
              </button>
            ) : (
              <ListTree className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <p className="truncate text-sm font-semibold text-foreground">Table of contents</p>
            {headings.length ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {headings.length}
              </span>
            ) : null}
          </div>
        </div>
        <nav
          aria-label="Article table of contents"
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-2"
        >
          {headings.length ? (
            headings.map((heading, index) => (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                onClick={
                  onHeadingClick
                    ? (event) => {
                        event.preventDefault();
                        onHeadingClick(heading, index);
                      }
                    : undefined
                }
                title={heading.text}
                aria-current={heading.id === activeId ? "location" : undefined}
                className={getTocItemClassName(heading.level, variant, heading.id === activeId)}
              >
                {heading.level > 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute bottom-1.5 top-1.5 w-px bg-border",
                      heading.level === 2 ? "left-2" : "left-4"
                    )}
                  />
                ) : null}
                <span className="line-clamp-2 min-w-0 break-words">{heading.text}</span>
              </a>
            ))
          ) : (
            <div className="m-2 rounded-lg border border-dashed px-3 py-6 text-center">
              <ListTree className="mx-auto mb-2 h-5 w-5 text-muted-foreground/60" />
              <p className="text-xs leading-5 text-muted-foreground">
                Add headings to build your article outline.
              </p>
            </div>
          )}
        </nav>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm font-semibold">Table of contents</p>
      {headings.length ? (
        <nav className="space-y-2 text-sm text-muted-foreground">
          {headings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={getTocItemClassName(heading.level, variant, false)}
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