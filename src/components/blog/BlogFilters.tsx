"use client";

import { useRouter } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { Search } from "lucide-react";

import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import type { BlogSort } from "@/lib/blog/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type BlogFiltersProps = {
  search: string;
  category: string;
  sort: BlogSort;
};

export function BlogFilters({ search, category, sort }: BlogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const updateParams = (next: Partial<BlogFiltersProps>) => {
    const params = new URLSearchParams();
    const merged = {
      search,
      category,
      sort,
      ...next,
    };

    if (merged.search.trim()) params.set("q", merged.search.trim());
    if (merged.category && merged.category !== "all") {
      params.set("category", merged.category);
    }
    if (merged.sort && merged.sort !== "latest") {
      params.set("sort", merged.sort);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <form
      className="grid gap-3 rounded-2xl border border-border/80 bg-card/70 p-4 md:grid-cols-[minmax(0,1fr)_180px_160px_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        updateParams({ search: String(formData.get("q") || "") });
      }}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={search}
          placeholder="Search articles"
          className="pl-9"
          aria-label="Search articles"
        />
      </div>

      <Select
        value={category || "all"}
        onValueChange={(value) => updateParams({ category: value })}
      >
        <SelectTrigger aria-label="Filter by category">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {BLOG_CATEGORIES.map((item) => (
            <SelectItem key={item.slug} value={item.slug}>
              {item.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sort}
        onValueChange={(value) => updateParams({ sort: value as BlogSort })}
      >
        <SelectTrigger aria-label="Sort articles">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="latest">Latest</SelectItem>
          <SelectItem value="popular">Popular</SelectItem>
        </SelectContent>
      </Select>

      <Button type="submit">Search</Button>
    </form>
  );
}
