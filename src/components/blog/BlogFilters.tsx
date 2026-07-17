"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function BlogFilters({
  showCategory = true,
}: {
  showCategory?: boolean;
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
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateParam("q", query.trim());
  };

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[1fr_auto_auto]">
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search articles"
          aria-label="Search articles"
        />
        <Button type="submit" variant="outline" size="icon" aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>
      </form>
      {showCategory ? (
        <Select
          value={searchParams?.get("category") ?? "all"}
          onValueChange={(value) => updateParam("category", value)}
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {BLOG_CATEGORIES.map((category) => (
              <SelectItem key={category.slug} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Select
        value={searchParams?.get("sort") ?? "latest"}
        onValueChange={(value) => updateParam("sort", value)}
      >
        <SelectTrigger className="w-full sm:w-40" aria-label="Sort">
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="latest">Latest</SelectItem>
          <SelectItem value="popular">Popular</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
