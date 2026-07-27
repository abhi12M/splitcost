"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  HelpCircle,
  ListTree,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BlogTableOfContents } from "@/components/blog/BlogTableOfContents";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { getBlogContentStats } from "@/lib/blog/content-stats";
import { buildBlogStructuredData, formatStructuredData } from "@/lib/blog/schema";
import { buildBlogTableOfContents } from "@/lib/blog/toc";
import type { Blog, BlogInput, BlogStatus } from "@/lib/blog/types";
import { estimateReadingTime, getExcerpt, slugify } from "@/lib/blog/utils";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BlogEditor } from "./BlogEditor";
import { BlogEditorShell } from "./BlogEditorShell";

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;
const AUTOSAVE_DELAY_MS = 2000;

function CharacterCounter({ value, max }: { value: string; max: number }) {
  const overLimit = value.length > max;
  return (
    <p className={cn("text-right text-xs", overLimit ? "text-destructive" : "text-muted-foreground")}>
      {value.length}/{max}
    </p>
  );
}

function getFilenameFromUrl(url: string) {
  try {
    const pathname = new URL(url, "https://splitcost.app").pathname;
    return decodeURIComponent(pathname.split("/").pop() || "cover-image");
  } catch {
    return url.split("/").pop() || "cover-image";
  }
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

type SettingsSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

function SettingsSection({ title, defaultOpen = true, children }: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-muted/50">
        {title}
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 px-4 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function FieldLabel({
  htmlFor,
  label,
  tooltip,
}: {
  htmlFor?: string;
  label: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={`${label} help`}>
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

export function BlogForm({ blog }: { blog?: Blog | null }) {
  const router = useRouter();
  const [blogId, setBlogId] = useState(blog?.id ?? "");
  const [title, setTitle] = useState(blog?.title ?? "");
  const [slug, setSlug] = useState(blog?.slug ?? "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(blog?.slug));
  const [excerpt, setExcerpt] = useState(blog?.excerpt ?? "");
  const [content, setContent] = useState(blog?.content ?? "");
  const [coverImage, setCoverImage] = useState(blog?.cover_image ?? "");
  const [coverAlt, setCoverAlt] = useState(blog?.title ?? "");
  const [coverDimensions, setCoverDimensions] = useState<string | null>(null);
  const [category, setCategory] = useState(blog?.category ?? BLOG_CATEGORIES[0].name);
  const [author, setAuthor] = useState(blog?.author ?? "SplitCost Team");
  const [status, setStatus] = useState<BlogStatus>(blog?.status ?? "draft");
  const [noIndex, setNoIndex] = useState(blog?.no_index ?? false);
  const [showToc, setShowToc] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(blog ? new Date(blog.updated_at) : null);
  const [error, setError] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readingTime = useMemo(() => estimateReadingTime(content), [content]);
  const contentStats = useMemo(() => getBlogContentStats(content), [content]);
  const generatedToc = useMemo(() => buildBlogTableOfContents(content), [content]);
  const activeTocId = generatedToc[0]?.id;

  const generatedSchema = useMemo(
    () =>
      buildBlogStructuredData({
        title: title.trim() || "Blog title",
        slug: slugify(slug || title || "blog-title"),
        excerpt: excerpt.trim() || getExcerpt(content, title),
        content,
        cover_image: coverImage || null,
        author: author.trim() || "SplitCost Team",
        published_at: blog?.published_at ?? null,
        updated_at: blog?.updated_at ?? null,
        reading_time: readingTime,
      }),
    [author, blog?.published_at, blog?.updated_at, content, coverImage, excerpt, readingTime, slug, title]
  );

  const savedLabel = lastSavedAt
    ? `Saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
    : "Saved";

  const markDirty = useCallback(() => {
    setIsDirty(true);
    setSaveStatus("idle");
  }, []);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManuallyEdited) setSlug(slugify(value));
    if (!coverAlt || coverAlt === title) setCoverAlt(value);
    markDirty();
  };

  const uploadCover = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/blog-images", { method: "POST", body: form });
    if (!response.ok) return;
    const data = (await response.json()) as { url: string };
    setCoverImage(data.url);
    markDirty();
  };

  const buildPayload = useCallback(
    (nextStatus: BlogStatus): BlogInput => ({
      title: title.trim() || "Untitled blog post",
      slug: slugify(slug || title || "untitled-blog-post"),
      excerpt: excerpt.trim() || getExcerpt(content, title) || "Draft blog post.",
      content,
      cover_image: coverImage || null,
      category,
      author: author.trim() || "SplitCost Team",
      status: nextStatus,
      published_at:
        nextStatus === "published"
          ? blog?.published_at ?? new Date().toISOString()
          : blog?.published_at ?? null,
      reading_time: readingTime,
      no_index: noIndex,
      schema_json: JSON.parse(formatStructuredData(generatedSchema)),
    }),
    [
      author,
      blog?.published_at,
      category,
      content,
      coverImage,
      excerpt,
      generatedSchema,
      noIndex,
      readingTime,
      slug,
      title,
    ]
  );

  const saveBlog = useCallback(
    async (nextStatus: BlogStatus, options?: { silent?: boolean }) => {
      if (!options?.silent) setSaving(true);
      setSaveStatus("saving");
      setError("");

      const payload = buildPayload(nextStatus);

      try {
        const response = await fetch(blogId ? `/api/blogs/${blogId}` : "/api/blogs", {
          method: blogId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Unable to save blog");
        }

        const saved = (await response.json()) as Blog;
        setBlogId(saved.id);
        setStatus(saved.status);
        setLastSavedAt(new Date(saved.updated_at));
        setIsDirty(false);
        setSaveStatus("saved");

        if (!blogId) {
          router.replace(`${ADMIN_BASE_PATH}/blogs/edit/${saved.id}`);
        }

        return saved;
      } catch (saveError) {
        setSaveStatus("error");
        setError(saveError instanceof Error ? saveError.message : "Unable to save blog");
        return null;
      } finally {
        if (!options?.silent) setSaving(false);
      }
    },
    [blogId, buildPayload, router]
  );

  useEffect(() => {
    if (!isDirty || saving) return undefined;

    autosaveTimerRef.current = setTimeout(() => {
      if (blogId) {
        void saveBlog("draft", { silent: true });
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [blogId, content, coverImage, excerpt, isDirty, noIndex, saveBlog, saving, slug, title]);

  const handlePreview = () => {
    const previewSlug = slugify(slug || title);
    if (!previewSlug) return;
    window.open(`/en/blog/${previewSlug}`, "_blank", "noopener,noreferrer");
  };

  const footer = (
    <div className="flex min-w-0 flex-col gap-2 px-4 py-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>{formatCount(contentStats.words)} words</span>
        <span>{formatCount(contentStats.characters)} characters</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>Reading time: {readingTime} min</span>
        <span>Headings: {contentStats.headings}</span>
        <span>Images: {contentStats.images}</span>
        <span>Internal links: {contentStats.internalLinks}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-2 w-2 rounded-full",
            saveStatus === "saved" ? "bg-emerald-500" : isDirty ? "bg-amber-500" : "bg-muted-foreground/40"
          )}
        />
        <span>{saveStatus === "saved" ? "Autosaved" : isDirty ? "Unsaved changes" : "Ready"}</span>
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <BlogEditorShell
        footer={footer}
        saveStatus={saveStatus}
        savedLabel={savedLabel}
        onPreview={slug || title ? handlePreview : undefined}
        onSaveDraft={() => void saveBlog("draft")}
        onPublish={() => void saveBlog("published")}
        saving={saving}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:flex-row lg:overflow-hidden">
          <aside
            className={cn(
              "hidden min-h-0 shrink-0 border-r bg-background lg:flex",
              showToc ? "w-64 xl:w-72" : "w-12"
            )}
          >
            {showToc ? (
              <BlogTableOfContents
                headings={generatedToc}
                variant="sidebar"
                activeId={activeTocId}
                onClose={() => setShowToc(false)}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center border-b py-3">
                <button
                  type="button"
                  onClick={() => setShowToc(true)}
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Show table of contents"
                >
                  <ListTree className="h-4 w-4" />
                </button>
              </div>
            )}
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-background lg:overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6 lg:overscroll-contain">
              {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
              <BlogEditor
                value={content}
                onChange={(value) => {
                  setContent(value);
                  markDirty();
                }}
              />
            </div>
          </main>

          <aside className="min-h-0 w-full min-w-0 shrink-0 border-l bg-background lg:flex lg:w-80 lg:flex-col lg:overflow-hidden">
            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
              <SettingsSection title="General">
                <div className="space-y-3">
                  <Label>Cover image</Label>
                  {coverImage ? (
                    <div className="overflow-hidden rounded-lg border bg-muted/20">
                      <div className="relative aspect-[3/2] bg-muted">
                        <img
                          src={coverImage}
                          alt={coverAlt || title || "Cover image"}
                          className="h-full w-full object-cover"
                          onLoad={(event) => {
                            const image = event.currentTarget;
                            setCoverDimensions(`${image.naturalWidth} x ${image.naturalHeight}px`);
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{getFilenameFromUrl(coverImage)}</p>
                          {coverDimensions ? <p className="text-muted-foreground">{coverDimensions}</p> : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => {
                            setCoverImage("");
                            setCoverDimensions(null);
                            markDirty();
                          }}
                          aria-label="Remove cover image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-2">
                    <Button type="button" variant="outline" className="justify-start" asChild>
                      <label className="cursor-pointer">
                        <Upload className="h-4 w-4" />
                        Upload file
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void uploadCover(file);
                          }}
                        />
                      </label>
                    </Button>
                    <Input
                      value={coverImage}
                      onChange={(event) => {
                        setCoverImage(event.target.value);
                        markDirty();
                      }}
                      placeholder="Enter image URL..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cover-alt">Alt text</Label>
                    <Textarea
                      id="cover-alt"
                      value={coverAlt}
                      onChange={(event) => {
                        setCoverAlt(event.target.value);
                        markDirty();
                      }}
                      rows={2}
                      placeholder="Describe the cover image"
                      className="min-h-[8rem] h-[8rem] sm:min-h-[8rem] sm:h-[8rem]"
                    />
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection title="SEO">
                <div className="space-y-2">
                  <FieldLabel htmlFor="slug" label="Slug" tooltip="The URL path for this post." />
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(event) => {
                      setSlugManuallyEdited(true);
                      setSlug(event.target.value);
                      markDirty();
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="seo-title"
                    label="Title"
                    tooltip="Shown in search results and browser tabs. Keep it under 60 characters."
                  />
                  <Input
                    id="seo-title"
                    value={title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    required
                  />
                  <CharacterCounter value={title} max={TITLE_MAX} />
                </div>

                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="seo-description"
                    label="Description"
                    tooltip="Meta description for search engines and social previews."
                  />
                  <Textarea
                    id="seo-description"
                    value={excerpt}
                    onChange={(event) => {
                      setExcerpt(event.target.value);
                      markDirty();
                    }}
                    rows={4}
                    required
                    className="min-h-[8rem] h-[8rem] sm:min-h-[8rem] sm:h-[8rem]"
                  />
                  <CharacterCounter value={excerpt} max={DESCRIPTION_MAX} />
                </div>
              </SettingsSection>

              <SettingsSection title="More settings" defaultOpen={false}>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onValueChange={(value) => {
                      setCategory(value);
                      markDirty();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOG_CATEGORIES.map((item) => (
                        <SelectItem key={item.slug} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(event) => {
                      setAuthor(event.target.value);
                      markDirty();
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="space-y-1">
                    <Label htmlFor="no-index">Noindex, follow</Label>
                    <p className="text-xs text-muted-foreground">Ask search engines not to index this post.</p>
                  </div>
                  <Switch
                    id="no-index"
                    checked={noIndex}
                    onCheckedChange={(value) => {
                      setNoIndex(value);
                      markDirty();
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Current status: {status}</p>
              </SettingsSection>
            </div>
          </aside>
        </div>
      </BlogEditorShell>
    </TooltipProvider>
  );
}
