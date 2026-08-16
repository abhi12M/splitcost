"use client";

import Link from "next/link";
import { Check, CheckSquare, Copy, ExternalLink, FileImage, ImageIcon, LayoutGrid, List, Loader2, Pencil, Receipt, Square, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type MediaItem = {
  path: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  updatedAt: string | null;
  source: "admin" | "expense";
  expense?: {
    id: string;
    description: string;
    amount: number;
    currency: string;
    date: string;
    groupId: string | null;
    groupName: string;
  };
};

type MediaSourceFilter = "all" | MediaItem["source"];
type MediaSortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "size-desc" | "size-asc";
type MediaDateFilter = "all" | "today" | "week" | "month" | "year";
type MediaView = "grid" | "list";

const sourceFilters: { value: MediaSourceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admin uploads" },
  { value: "expense", label: "Expense attachments" },
];

const sortOptions: { value: MediaSortOption; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "size-desc", label: "Largest first" },
  { value: "size-asc", label: "Smallest first" },
];

const dateFilterOptions: { value: MediaDateFilter; label: string }[] = [
  { value: "all", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "year", label: "This year" },
];

function formatBytes(bytes: number) {
  if (!bytes) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function MediaAdmin() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<MediaSourceFilter>("all");
  const [sortBy, setSortBy] = useState<MediaSortOption>("newest");
  const [dateFilter, setDateFilter] = useState<MediaDateFilter>("all");
  const [view, setView] = useState<MediaView>("grid");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState("");
  const [deleteTargets, setDeleteTargets] = useState<MediaItem[]>([]);
  const [renameTarget, setRenameTarget] = useState<MediaItem | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(() => new Set());
  const [copiedPath, setCopiedPath] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  const filteredMedia = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sourceFiltered = media.filter((item) =>
      sourceFilter === "all" ? true : item.source === sourceFilter
    );
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const dateFiltered = sourceFiltered.filter((item) => {
      if (dateFilter === "all") return true;

      const updatedAt = new Date(item.updatedAt ?? 0).getTime();
      if (dateFilter === "today") return updatedAt >= startOfToday;
      if (dateFilter === "week") return updatedAt >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
      if (dateFilter === "month") return updatedAt >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return updatedAt >= startOfYear;
    });

    const searchedMedia = normalizedQuery
      ? dateFiltered.filter((item) =>
          [
            item.name,
            item.path,
            item.mimeType,
            item.source,
            item.expense?.description,
            item.expense?.groupName,
            item.expense?.currency,
          ].some((value) =>
            value
              ? value.toLowerCase().includes(normalizedQuery)
              : false
          )
        )
      : dateFiltered;

    return [...searchedMedia].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime();
      }

      if (sortBy === "name-asc" || sortBy === "name-desc") {
        const aName = (a.expense?.description || a.name).toLowerCase();
        const bName = (b.expense?.description || b.name).toLowerCase();
        return sortBy === "name-asc"
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      }

      if (sortBy === "size-desc" || sortBy === "size-asc") {
        return sortBy === "size-desc" ? b.size - a.size : a.size - b.size;
      }

      return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
    });
  }, [dateFilter, media, query, sortBy, sourceFilter]);

  const counts = useMemo(() => {
    return media.reduce(
      (totals, item) => {
        totals.all += 1;
        totals[item.source] += 1;
        return totals;
      },
      { all: 0, admin: 0, expense: 0 } as Record<MediaSourceFilter, number>
    );
  }, [media]);

  const emptyMessage = useMemo(() => {
    if (sourceFilter === "expense") {
      return {
        title: "No expense attachments found",
        body: "User-uploaded expense receipts and attachment images will appear here.",
      };
    }

    if (sourceFilter === "admin") {
      return {
        title: "No admin uploads found",
        body: "Upload your first admin image to see it here.",
      };
    }

    return {
      title: "No media found",
      body: "Upload admin images or add expense attachments to see them here.",
    };
  }, [sourceFilter]);

  const getMediaKey = (item: MediaItem) => `${item.source}:${item.path}`;

  const selectedAdminMedia = useMemo(
    () => media.filter((item) => item.source === "admin" && selectedPaths.has(item.path)),
    [media, selectedPaths]
  );

  const matchesSourceLabel = (item: MediaItem) =>
    sourceFilters.find((filter) => filter.value === item.source)?.label ?? item.source;

  const formatExpenseAmount = (item: MediaItem) => {
    if (!item.expense) return "";

    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: item.expense.currency,
      maximumFractionDigits: 2,
    }).format(item.expense.amount);
  };

  const loadMedia = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin-media", { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Unable to load media");
      }

      const data = (await response.json()) as { media: MediaItem[] };
      setMedia(data.media);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load media");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMedia();
  }, [loadMedia]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
      if (!images.length) return;

      setUploading(true);
      setError("");

      try {
        const uploaded: MediaItem[] = [];

        for (const file of images) {
          const form = new FormData();
          form.append("file", file);

          const response = await fetch("/api/admin-media", {
            method: "POST",
            body: form,
          });

          if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.error ?? `Unable to upload ${file.name}`);
          }

          const data = (await response.json()) as { media: MediaItem };
          uploaded.push(data.media);
        }

        setMedia((current) => [...uploaded, ...current]);
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Unable to upload media");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    []
  );

  const copyUrl = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedPath(getMediaKey(item));
      window.setTimeout(() => setCopiedPath(""), 2000);
    } catch {
      setError("Unable to copy media URL");
    }
  };

  const toggleSelected = (item: MediaItem) => {
    if (item.source !== "admin") return;

    setSelectedPaths((current) => {
      const next = new Set(current);
      if (next.has(item.path)) next.delete(item.path);
      else next.add(item.path);
      return next;
    });
  };

  const deleteMedia = async (items: MediaItem[]) => {
    const paths = items.filter((item) => item.source === "admin").map((item) => item.path);
    if (!paths.length) return;

    setDeletingPath(paths.length === 1 ? `admin:${paths[0]}` : "bulk");
    setError("");

    try {
      const response = await fetch("/api/admin-media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Unable to delete media");
      }

      setMedia((current) =>
        current.filter((mediaItem) => !paths.includes(mediaItem.path))
      );
      setSelectedPaths((current) => {
        const next = new Set(current);
        paths.forEach((path) => next.delete(path));
        return next;
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete media");
    } finally {
      setDeletingPath("");
      setDeleteTargets([]);
    }
  };

  const openRename = (item: MediaItem) => {
    setRenameTarget(item);
    setRenameName(item.name);
    setError("");
  };

  const renameMedia = async () => {
    if (!renameTarget || !renameName.trim()) return;

    setRenaming(true);
    setError("");

    try {
      const response = await fetch("/api/admin-media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: renameTarget.path, name: renameName }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Unable to rename media");
      }

      const data = (await response.json()) as { media: Partial<MediaItem> & Pick<MediaItem, "path" | "name" | "url"> };
      setMedia((current) =>
        current.map((item) =>
          item.source === "admin" && item.path === renameTarget.path
            ? { ...item, ...data.media }
            : item
        )
      );
      setSelectedPaths((current) => {
        if (!current.has(renameTarget.path)) return current;
        const next = new Set(current);
        next.delete(renameTarget.path);
        next.add(data.media.path);
        return next;
      });
      setRenameTarget(null);
      setRenameName("");
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Unable to rename media");
    } finally {
      setRenaming(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Media Library</h2>
          <p className="text-sm text-muted-foreground">
            Upload admin images and review user expense attachments.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search media"
            className="sm:w-64"
          />
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as MediaSortOption)}>
            <SelectTrigger className="sm:w-44" aria-label="Sort media">
              <SelectValue placeholder="Sort media" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as MediaDateFilter)}>
            <SelectTrigger className="sm:w-40" aria-label="Filter by date added">
              <SelectValue placeholder="Date added" />
            </SelectTrigger>
            <SelectContent>
              {dateFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1" role="group" aria-label="Media view">
            <Button
              type="button"
              variant={view === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setView("grid")}
              aria-label="Card view"
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={view === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setView("list")}
              aria-label="List view"
              title="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Upload
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) void uploadFiles(event.target.files);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void uploadFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-36 w-full flex-col items-center justify-center rounded-lg border border-dashed bg-background px-5 py-8 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        <UploadCloud className="mb-3 h-8 w-8 text-primary" />
        <span className="text-sm font-medium">Drop images here or choose files</span>
        <span className="mt-1 text-xs text-muted-foreground">Images are converted to optimized WebP files.</span>
      </button>

      <div className="flex flex-wrap gap-2">
        {sourceFilters.map((filter) => (
          <Button
            key={filter.value}
            type="button"
            variant={sourceFilter === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter(filter.value)}
          >
            {filter.value === "expense" ? (
              <Receipt className="h-4 w-4" />
            ) : (
              <FileImage className="h-4 w-4" />
            )}
            {filter.label}
            <span
              className={cn(
                "ml-1 rounded-full px-2 py-0.5 text-xs",
                sourceFilter === filter.value
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {counts[filter.value]}
            </span>
          </Button>
        ))}
      </div>

      {selectedAdminMedia.length ? (
        <div className="flex flex-wrap items-center gap-2 border-y py-3">
          <span className="text-sm text-muted-foreground">
            {selectedAdminMedia.length} selected
          </span>
          <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteTargets(selectedAdminMedia)}>
            <Trash2 className="h-4 w-4" />
            Delete selected
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPaths(new Set())}>
            Clear selection
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border bg-background p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading media...
        </div>
      ) : filteredMedia.length && view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMedia.map((item) => (
            <article key={getMediaKey(item)} className="overflow-hidden rounded-lg border bg-background shadow-sm">
              <div className="aspect-[4/3] bg-muted">
                <img src={item.url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="space-y-3 p-3">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                      {item.source === "expense" ? (
                        <Receipt className="h-3.5 w-3.5" />
                      ) : (
                        <FileImage className="h-3.5 w-3.5" />
                      )}
                      {matchesSourceLabel(item)}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.expense ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {formatExpenseAmount(item)}
                        </span>
                      ) : null}
                      {item.source === "admin" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleSelected(item)}
                          aria-label={`${selectedPaths.has(item.path) ? "Deselect" : "Select"} ${item.name}`}
                          aria-pressed={selectedPaths.has(item.path)}
                        >
                          {selectedPaths.has(item.path) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.expense?.description || item.name}
                  </p>
                  {item.expense ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.expense.groupName} | {formatDateTime(item.expense.date)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{formatBytes(item.size)}</span>
                  <span>{formatDateTime(item.updatedAt)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => void copyUrl(item)}
                  >
                    {copiedPath === getMediaKey(item) ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Copy URL
                  </Button>
                  {item.expense?.groupId ? (
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link href={`/group/${item.expense.groupId}/expense/${item.expense.id}`}>
                        <ExternalLink className="h-4 w-4" />
                        View expense
                      </Link>
                    </Button>
                  ) : null}
                  {item.source === "admin" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openRename(item)}
                      disabled={renaming || Boolean(deletingPath)}
                      aria-label={`Rename ${item.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {item.source === "admin" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setDeleteTargets([item])}
                      disabled={Boolean(deletingPath)}
                      aria-label={`Delete ${item.name}`}
                    >
                      {deletingPath === getMediaKey(item) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : filteredMedia.length ? (
        <div className="divide-y overflow-hidden rounded-lg border bg-background">
          {filteredMedia.map((item) => (
            <article key={getMediaKey(item)} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <div className="h-20 w-full shrink-0 overflow-hidden rounded-md bg-muted sm:w-28">
                <img src={item.url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.expense?.description || item.name}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    {item.source === "expense" ? <Receipt className="h-3.5 w-3.5" /> : <FileImage className="h-3.5 w-3.5" />}
                    {matchesSourceLabel(item)}
                  </span>
                </div>
                {item.expense ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {item.expense.groupName} | {formatExpenseAmount(item)} | {formatDateTime(item.expense.date)}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                <span className="mr-1 text-xs text-muted-foreground">
                  {formatBytes(item.size)} | {formatDateTime(item.updatedAt)}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => void copyUrl(item)}>
                  {copiedPath === getMediaKey(item) ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy URL
                </Button>
                {item.expense?.groupId ? (
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={`/group/${item.expense.groupId}/expense/${item.expense.id}`}>
                      <ExternalLink className="h-4 w-4" />
                      View expense
                    </Link>
                  </Button>
                ) : null}
                {item.source === "admin" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => openRename(item)}
                    disabled={renaming || Boolean(deletingPath)}
                    aria-label={`Rename ${item.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                ) : null}
                {item.source === "admin" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleSelected(item)}
                    aria-label={`${selectedPaths.has(item.path) ? "Deselect" : "Select"} ${item.name}`}
                    aria-pressed={selectedPaths.has(item.path)}
                  >
                    {selectedPaths.has(item.path) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                  </Button>
                ) : null}
                {item.source === "admin" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setDeleteTargets([item])}
                    disabled={Boolean(deletingPath)}
                    aria-label={`Delete ${item.name}`}
                  >
                    {deletingPath === getMediaKey(item) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-background p-10 text-center">
          <ImageIcon className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">{emptyMessage.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {emptyMessage.body}
          </p>
        </div>
      )}

      <AlertDialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open && !renaming) {
            setRenameTarget(null);
            setRenameName("");
          }
        }}
      >
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Rename media</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              The image remains in its current folder. Blog references are updated automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={renameName}
            onChange={(event) => setRenameName(event.target.value)}
            placeholder="Image filename"
            disabled={renaming}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void renameMedia();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Images are stored as WebP, so the filename will end in .webp.
          </p>
          <AlertDialogFooter className="mt-2 flex-row gap-2">
            <AlertDialogCancel disabled={renaming} className="mt-0 flex-1 rounded-xl">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void renameMedia();
              }}
              disabled={renaming || !renameName.trim()}
              className="flex-1 rounded-xl"
            >
              {renaming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(deleteTargets.length)}
        onOpenChange={(open) => {
          if (!open && !deletingPath) setDeleteTargets([]);
        }}
      >
        <AlertDialogContent className="max-w-[290px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">
              Delete {deleteTargets.length > 1 ? "selected media" : "media"}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This permanently deletes {deleteTargets.length > 1 ? `${deleteTargets.length} media files` : deleteTargets[0]?.name ?? "this media file"} from the media library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex-row gap-2">
            <AlertDialogCancel
              disabled={Boolean(deletingPath)}
              className="mt-0 flex-1 rounded-xl border-none bg-muted hover:bg-muted/80"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void deleteMedia(deleteTargets);
              }}
              disabled={Boolean(deletingPath)}
              className="flex-1 rounded-xl bg-destructive text-white hover:bg-destructive/90"
            >
              {deletingPath ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
