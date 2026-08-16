"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ListTree } from "lucide-react";

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
      : "relative block rounded-r-md border-l-2 py-1.5 pr-2 transition-all duration-300 ease-out";

  const activeClass =
    variant === "sidebar" && active
      ? "bg-primary/10 font-medium text-primary"
      : variant === "sidebar"
        ? "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        : "";

  if (variant === "default") {
    const stateClass = active
      ? "border-primary bg-primary/10 font-semibold text-primary shadow-[inset_10px_0_18px_-18px_hsl(var(--primary))]"
      : "border-transparent text-muted-foreground hover:border-primary/30 hover:bg-muted/60 hover:text-foreground";

    if (level <= 1) return cn(base, "pl-3 font-medium", stateClass);
    if (level === 2) return cn(base, "pl-3", stateClass);
    if (level === 3) return cn(base, "pl-6 text-xs", stateClass);
    if (level === 4) return cn(base, "pl-8 text-xs", stateClass);
    if (level === 5) return cn(base, "pl-10 text-xs", stateClass);
    return cn(base, "pl-12 text-xs", stateClass);
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [observedActiveId, setObservedActiveId] = useState<string>();
  const navRef = useRef<HTMLElement>(null);
  const effectiveActiveId = activeId ?? observedActiveId;

  const outline = useMemo(
    () =>
      headings.map((heading, index) => {
        let parentId: string | undefined;
        for (let previous = index - 1; previous >= 0; previous -= 1) {
          if (headings[previous].level > 1 && headings[previous].level < heading.level) {
            parentId = headings[previous].id;
            break;
          }
        }

        return {
          ...heading,
          parentId,
          hasChildren: heading.level > 1 && headings[index + 1]?.level > heading.level,
        };
      }),
    [headings]
  );

  useEffect(() => {
    if (activeId || !headings.length) return;

    let frame = 0;
    const updateActiveHeading = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const activationLine = window.scrollY + Math.min(180, window.innerHeight * 0.25);
        let nextId = headings[0].id;

        for (const heading of headings) {
          const element = document.getElementById(heading.id);
          if (!element) continue;
          const elementTop = element.getBoundingClientRect().top + window.scrollY;
          if (elementTop <= activationLine) nextId = heading.id;
          else break;
        }

        setObservedActiveId((current) => (current === nextId ? current : nextId));
      });
    };

    updateActiveHeading();
    window.addEventListener("scroll", updateActiveHeading, { passive: true });
    window.addEventListener("resize", updateActiveHeading);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveHeading);
      window.removeEventListener("resize", updateActiveHeading);
    };
  }, [activeId, headings]);

  useEffect(() => {
    if (!effectiveActiveId) return;

    const activeItem = outline.find((heading) => heading.id === effectiveActiveId);
    if (activeItem?.parentId) {
      setExpandedIds((current) => {
        if (current.has(activeItem.parentId!)) return current;
        const next = new Set(current);
        next.add(activeItem.parentId!);
        return next;
      });
    }

    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>(
      `[data-toc-id="${CSS.escape(effectiveActiveId)}"]`
    );
    if (nav && link && nav.scrollHeight > nav.clientHeight) {
      nav.scrollTo({
        top: Math.max(0, link.offsetTop - nav.clientHeight / 2 + link.clientHeight / 2),
        behavior: "smooth",
      });
    }
  }, [effectiveActiveId, outline]);

  const selectHeading = (
    event: React.MouseEvent<HTMLAnchorElement>,
    heading: BlogTocItem,
    index: number
  ) => {
    event.preventDefault();
    setObservedActiveId(heading.id);

    if (onHeadingClick) {
      onHeadingClick(heading, index);
      return;
    }

    const target = document.getElementById(heading.id);
    if (!target) return;
    window.history.replaceState(null, "", `#${heading.id}`);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    onClose?.();
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
          ref={navRef}
          aria-label="Article table of contents"
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-2"
        >
          {headings.length ? (
            headings.map((heading, index) => (
              <a
                key={heading.id}
                href={`#${heading.id}`}
                onClick={(event) => selectHeading(event, heading, index)}
                data-toc-id={heading.id}
                title={heading.text}
                aria-current={heading.id === effectiveActiveId ? "location" : undefined}
                className={getTocItemClassName(
                  heading.level,
                  variant,
                  heading.id === effectiveActiveId
                )}
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
      {headings.length ? (
        <nav
          ref={navRef}
          aria-label="Article table of contents"
          className="space-y-1 text-sm text-muted-foreground"
        >
          {outline.map((heading, index) => {
            const isVisible = !heading.parentId || expandedIds.has(heading.parentId);
            const isExpanded = expandedIds.has(heading.id);
            const isActive = heading.id === effectiveActiveId;

            return (
              <div key={heading.id} className={isVisible ? "" : "hidden"}>
                <div className="flex items-start gap-1">
                  {heading.hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(heading.id)}
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} ${heading.text}`}
                      className="mt-2 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
                    </button>
                  ) : (
                    <span className="w-5 shrink-0" />
                  )}
                  <a
                    href={`#${heading.id}`}
                    onClick={(event) => selectHeading(event, heading, index)}
                    data-toc-id={heading.id}
                    aria-current={isActive ? "location" : undefined}
                    className={cn(
                      getTocItemClassName(heading.level, variant, isActive),
                      "flex-1"
                    )}
                  >
                    {heading.text}
                  </a>
                </div>
              </div>
            );
          })}
        </nav>
      ) : (
        <p className="text-sm text-muted-foreground">Article overview</p>
      )}
    </>
  );
}
