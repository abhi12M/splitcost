import type { BlogTocItem } from "@/lib/blog/toc";
import { cn } from "@/lib/utils";

type BlogTableOfContentsProps = {
  headings: BlogTocItem[];
  variant?: "default" | "sidebar";
  activeId?: string;
  onClose?: () => void;
};

function getTocItemClassName(level: number, variant: "default" | "sidebar", active: boolean) {
  const base =
    variant === "sidebar"
      ? "block rounded-md px-2 py-1.5 text-sm transition-colors"
      : "block hover:text-foreground";

  const activeClass =
    variant === "sidebar" && active
      ? "bg-primary/10 font-medium text-primary"
      : variant === "sidebar"
        ? "text-muted-foreground hover:bg-muted hover:text-foreground"
        : "";

  if (variant === "default") {
    if (level <= 1) return cn(base, "font-medium hover:text-foreground");
    if (level === 2) return cn(base, "pl-3");
    if (level === 3) return cn(base, "pl-6 text-xs");
    if (level === 4) return cn(base, "pl-8 text-xs");
    if (level === 5) return cn(base, "pl-10 text-xs");
    return cn(base, "pl-12 text-xs");
  }

  if (level <= 1) return cn(base, activeClass);
  if (level === 2) return cn(base, "pl-4", activeClass);
  if (level === 3) return cn(base, "pl-6 text-xs", activeClass);
  if (level === 4) return cn(base, "pl-8 text-xs", activeClass);
  return cn(base, "pl-10 text-xs", activeClass);
}

export function BlogTableOfContents({
  headings,
  variant = "default",
  activeId,
  onClose,
}: BlogTableOfContentsProps) {
  if (variant === "sidebar") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Table of contents</p>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close table of contents"
            >
              ×
            </button>
          ) : null}
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {headings.length ? (
            headings.map((heading) => (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                className={getTocItemClassName(heading.level, variant, heading.id === activeId)}
              >
                {heading.text}
              </a>
            ))
          ) : (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Headings appear here as you write.</p>
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