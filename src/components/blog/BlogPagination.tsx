"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BlogPaginationProps = {
  page: number;
  totalPages: number;
  searchParams?: Record<string, string | undefined>;
};

export function BlogPagination({
  page,
  totalPages,
  searchParams = {},
}: BlogPaginationProps) {
  const pathname = usePathname();

  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (value) =>
      value === 1 ||
      value === totalPages ||
      Math.abs(value - page) <= 1
  );

  const items: (number | "…")[] = [];
  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) items.push("…");
    items.push(value);
  });

  return (
    <nav
      aria-label="Blog pagination"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      <Button asChild variant="outline" size="sm" disabled={page <= 1}>
        <Link
          href={hrefFor(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(page <= 1 && "pointer-events-none opacity-50")}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Link>
      </Button>

      {items.map((item, index) =>
        item === "…" ? (
          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
            …
          </span>
        ) : (
          <Button
            key={item}
            asChild
            size="sm"
            variant={item === page ? "default" : "outline"}
          >
            <Link href={hrefFor(item)} aria-current={item === page ? "page" : undefined}>
              {item}
            </Link>
          </Button>
        )
      )}

      <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
        <Link
          href={hrefFor(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={cn(page >= totalPages && "pointer-events-none opacity-50")}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </nav>
  );
}
