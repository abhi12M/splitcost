"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import type { BlogCategory } from "@/lib/blog/categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BlogFilters({
  categories: _categories,
  showCategory: _showCategory = true,
  showSearch = true,
  showSort = true,
}: {
  categories: BlogCategory[];
  showCategory?: boolean;
  showSearch?: boolean;
  showSort?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get("q") ?? "");

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.delete("page");
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParam("q", query.trim());
  };

  return (
    <div className={showSearch && showSort ? "grid gap-3 sm:grid-cols-[1fr_auto]" : "contents"}>
      {showSearch ? <form className="relative w-full" onSubmit={handleSubmit}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search guides, topics, or keywords..."
          aria-label="Search guides"
          className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </form> : null}

      {showSort ? <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="whitespace-nowrap">Sort by:</span>
        <Select
          value={searchParams?.get("sort") ?? "latest"}
          onValueChange={(value) => updateParam("sort", value)}
        >
          <SelectTrigger className="h-9 w-[112px] rounded-lg bg-card text-xs" aria-label="Sort guides">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="popular">Popular</SelectItem>
          </SelectContent>
        </Select>
      </div> : null}
    </div>
  );
}
