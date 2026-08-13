"use client";

import { Loader2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { BlogCategory } from "@/lib/blog/categories";
import { slugify } from "@/lib/blog/utils";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";

type BlogCategorySelectProps = {
  value: string;
  onChange: (value: string) => void;
  initialCategories?: BlogCategory[];
  className?: string;
};

const NO_CATEGORY_VALUE = "__no_category__";

export function BlogCategorySelect({
  value,
  onChange,
  initialCategories,
  className,
}: BlogCategorySelectProps) {
  const [categories, setCategories] = useState<BlogCategory[]>(initialCategories ?? []);
  const [loading, setLoading] = useState(!initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/blog-categories");
      if (!response.ok) throw new Error("Unable to load categories");
      const data = (await response.json()) as BlogCategory[];
      setCategories(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to load categories",
        description: error instanceof Error ? error.message : "Unable to load categories",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCategories) {
      void loadCategories();
    }
  }, [initialCategories, loadCategories]);

  const createCategory = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        variant: "destructive",
        title: "Category name is required",
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/blog-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          slug: slugify(trimmedName),
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Unable to create category");
      }

      const created = (await response.json()) as BlogCategory;
      setCategories((current) => [...current, created]);
      onChange(created.name);
      setDialogOpen(false);
      setName("");
      setDescription("");
      toast({
        title: "Category created",
        description: created.name,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to create category",
        description: error instanceof Error ? error.message : "Unable to create category",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Select
        value={value || NO_CATEGORY_VALUE}
        onValueChange={(nextValue) =>
          onChange(nextValue === NO_CATEGORY_VALUE ? "" : nextValue)
        }
        disabled={loading}
      >
        <SelectTrigger aria-label="Category">
          {loading ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading categories...
            </span>
          ) : (
            <SelectValue placeholder="Select category" />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_CATEGORY_VALUE}>No category</SelectItem>
          {categories.map((item) => (
            <SelectItem key={item.id} value={item.name}>
              {item.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          New category
        </Button>
        <Button asChild type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <a href={`${ADMIN_BASE_PATH}/categories`} target="_blank" rel="noreferrer">
            Manage categories
          </a>
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-category-name">Name</Label>
              <Input
                id="new-category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Travel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-category-description">Description</Label>
              <Textarea
                id="new-category-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void createCategory()} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
