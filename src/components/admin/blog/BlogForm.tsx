"use client";

import { formatDistanceToNow } from "date-fns";
import {
  Check,
  ChevronDown,
  Code2,
  Copy,
  HelpCircle,
  ImageUp,
  ListTree,
  Trash2,
  X,
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
  help?: string;
  children: React.ReactNode;
};

function SettingsSection({ title, defaultOpen = true, help, children }: SettingsSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-xl border bg-background shadow-sm"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-semibold transition-colors hover:bg-muted/40">
        <span className="flex items-center gap-2">
          {title}
          {help ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="img"
                  aria-label={`${title} help`}
                  onClick={(event) => event.stopPropagation()}
                  className="text-muted-foreground"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                {help}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t px-4 py-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function FieldLabel({
  htmlFor,
  label,
  tooltip,
  required,
}: {
  htmlFor?: string;
  label: string;
  tooltip?: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
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
  const [coverAlt, setCoverAlt] = useState(blog?.cover_alt ?? blog?.title ?? "");
  const [coverDimensions, setCoverDimensions] = useState<string | null>(null);
  const [category, setCategory] = useState(blog?.category ?? BLOG_CATEGORIES[0].name);
  const [author, setAuthor] = useState(blog?.author ?? "SplitCost Team");
  const [noIndex, setNoIndex] = useState(blog?.no_index ?? false);
  const [showToc, setShowToc] = useState(true);
  const [activeTocId, setActiveTocId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(blog ? new Date(blog.updated_at) : null);
  const [error, setError] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [schemaEdited, setSchemaEdited] = useState(Boolean(blog?.schema_json));
  const [schemaCopied, setSchemaCopied] = useState(false);
  const [schemaEditorOpen, setSchemaEditorOpen] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const readingTime = useMemo(() => estimateReadingTime(content), [content]);
  const contentStats = useMemo(() => getBlogContentStats(content), [content]);
  const generatedToc = useMemo(() => buildBlogTableOfContents(content), [content]);

  useEffect(() => {
    setActiveTocId((current) =>
      current && generatedToc.some((heading) => heading.id === current)
        ? current
        : generatedToc[0]?.id
    );
  }, [generatedToc]);

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
  const [schemaJson, setSchemaJson] = useState(() =>
    formatStructuredData(blog?.schema_json)
  );

  useEffect(() => {
    if (!schemaEdited) {
      setSchemaJson(formatStructuredData(generatedSchema));
    }
  }, [generatedSchema, schemaEdited]);

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

  const copySchemaJson = async () => {
    try {
      await navigator.clipboard.writeText(schemaJson);
      setSchemaCopied(true);
      window.setTimeout(() => setSchemaCopied(false), 2000);
    } catch {
      setSchemaCopied(false);
    }
  };

  const copyPostUrl = async () => {
    const postSlug = slugify(slug || title || "enter-blog-slug");
    try {
      await navigator.clipboard.writeText(`https://splitcost.app/blog/${postSlug}`);
      setSlugCopied(true);
      window.setTimeout(() => setSlugCopied(false), 2000);
    } catch {
      setSlugCopied(false);
    }
  };

  const buildPayload = useCallback(
    (nextStatus: BlogStatus): BlogInput => ({
      title: title.trim() || "Untitled blog post",
      slug: slugify(slug || title || "untitled-blog-post"),
      excerpt: excerpt.trim() || getExcerpt(content, title) || "Draft blog post.",
      content,
      cover_image: coverImage || null,
      cover_alt: coverAlt.trim() || null,
      category,
      author: author.trim() || "SplitCost Team",
      status: nextStatus,
      published_at:
        nextStatus === "published"
          ? blog?.published_at ?? new Date().toISOString()
          : blog?.published_at ?? null,
      reading_time: readingTime,
      no_index: noIndex,
      schema_json: schemaEdited
        ? schemaJson.trim()
          ? JSON.parse(schemaJson)
          : null
        : generatedSchema,
    }),
    [
      author,
      blog?.published_at,
      category,
      content,
      coverAlt,
      coverImage,
      excerpt,
      generatedSchema,
      noIndex,
      readingTime,
      schemaEdited,
      schemaJson,
      slug,
      title,
    ]
  );

  const saveBlog = useCallback(
    async (nextStatus: BlogStatus, options?: { silent?: boolean }) => {
      if (!options?.silent) setSaving(true);
      setSaveStatus("saving");
      setError("");

      let payload: BlogInput;
      try {
        payload = buildPayload(nextStatus);
      } catch {
        setSaveStatus("error");
        setError("Structured schema must be valid JSON.");
        if (!options?.silent) setSaving(false);
        return null;
      }

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

  const uploadBlogImage = useCallback(
    async (file: File, kind: "cover" | "inline") => {
      const targetBlogId =
        blogId || (await saveBlog("draft", { silent: true }))?.id;

      if (!targetBlogId) {
        throw new Error("Save the blog before uploading images");
      }

      const form = new FormData();
      form.append("file", file);
      form.append("blogId", targetBlogId);
      form.append("kind", kind);

      const response = await fetch("/api/blog-images", {
        method: "POST",
        body: form,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Unable to upload image");
      }

      const data = (await response.json()) as { url: string };
      return data.url;
    },
    [blogId, saveBlog]
  );

  const uploadCover = useCallback(
    async (file: File) => {
      try {
        const url = await uploadBlogImage(file, "cover");
        setCoverImage(url);
        markDirty();
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Unable to upload cover image"
        );
      }
    },
    [markDirty, uploadBlogImage]
  );

  const uploadInlineImage = useCallback(
    (file: File) => uploadBlogImage(file, "inline"),
    [uploadBlogImage]
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
  }, [blogId, content, coverAlt, coverImage, excerpt, isDirty, noIndex, saveBlog, saving, schemaJson, slug, title]);

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
                onHeadingClick={(heading, index) => {
                  const editorHeadings =
                    editorContainerRef.current?.querySelectorAll<HTMLElement>(
                      ".blog-editor-content h1, .blog-editor-content h2, .blog-editor-content h3, .blog-editor-content h4, .blog-editor-content h5, .blog-editor-content h6"
                    );
                  const target = editorHeadings?.[index];
                  if (!target) return;

                  target.id = heading.id;
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
                  setActiveTocId(heading.id);
                  window.history.replaceState(null, "", `#${heading.id}`);
                }}
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
            <div
              ref={editorContainerRef}
              className="flex min-h-0 flex-1 flex-col p-4 sm:p-6 lg:overscroll-contain"
            >
              {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
              <BlogEditor
                value={content}
                onImageUpload={uploadInlineImage}
                onChange={(value) => {
                  setContent(value);
                  markDirty();
                }}
              />
            </div>
          </main>

          <aside className="min-h-0 w-full min-w-0 shrink-0 border-l bg-muted/30 lg:flex lg:w-96 lg:flex-col lg:overflow-hidden">
            <div className="space-y-3 p-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
              <SettingsSection
                title="Cover Image"
                help="Upload a cover image or paste a direct image URL. Use descriptive alt text for accessibility."
              >
                {coverImage ? (
                  <div className="overflow-hidden rounded-lg border bg-muted/20">
                    <div className="relative aspect-[3/2] bg-muted">
                      <img
                        src={coverImage}
                        alt={coverAlt || title || "Cover image"}
                        className="h-full w-full object-cover"
                        onLoad={(event) => {
                          const image = event.currentTarget;
                          setCoverDimensions(`${image.naturalWidth} × ${image.naturalHeight}px`);
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
                        className="h-8 w-8 shrink-0"
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
                ) : (
                  <label
                    className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 px-4 py-5 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const file = event.dataTransfer.files?.[0];
                      if (file?.type.startsWith("image/")) void uploadCover(file);
                    }}
                  >
                    <ImageUp className="mb-2 h-6 w-6 text-foreground" />
                    <span className="text-sm font-medium">Upload Image</span>
                    <span className="mt-1 text-xs text-muted-foreground">or paste image URL</span>
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
                )}

                <div className="space-y-2">
                  <Label htmlFor="cover-url">Image URL</Label>
                  <Input
                    id="cover-url"
                    value={coverImage}
                    onChange={(event) => {
                      setCoverImage(event.target.value);
                      markDirty();
                    }}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cover-alt">Alt Text</Label>
                  <Input
                    id="cover-alt"
                    value={coverAlt}
                    onChange={(event) => {
                      setCoverAlt(event.target.value);
                      markDirty();
                    }}
                    placeholder="Describe your image for accessibility"
                  />
                </div>
              </SettingsSection>

              <SettingsSection title="Post Details">
                <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3">
                  <FieldLabel htmlFor="post-title" label="Title" required />
                  <div className="space-y-1">
                    <Input
                      id="post-title"
                      value={title}
                      onChange={(event) => handleTitleChange(event.target.value)}
                      placeholder="Enter blog title"
                      required
                    />
                    <CharacterCounter value={title} max={TITLE_MAX} />
                  </div>

                  <FieldLabel htmlFor="slug" label="Slug" required tooltip="The URL path for this post." />
                  <div className="space-y-1">
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(event) => {
                        setSlugManuallyEdited(true);
                        setSlug(event.target.value);
                        markDirty();
                      }}
                      placeholder="enter-blog-slug"
                      required
                    />
                    <div className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
                      <span className="min-w-0 truncate">
                        https://splitcost.app/blog/{slugify(slug || title || "enter-blog-slug")}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyPostUrl()}
                        className="shrink-0 rounded p-0.5 hover:bg-muted hover:text-foreground"
                        aria-label="Copy post URL"
                      >
                        {slugCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <FieldLabel
                    htmlFor="post-description"
                    label="Description"
                    required
                  />
                  <div className="space-y-1">
                    <Textarea
                      id="post-description"
                      value={excerpt}
                      onChange={(event) => {
                        setExcerpt(event.target.value);
                        markDirty();
                      }}
                      rows={3}
                      placeholder="Write a short description for your blog..."
                      required
                      className="min-h-20 resize-none"
                    />
                    <CharacterCounter value={excerpt} max={DESCRIPTION_MAX} />
                  </div>

                  <FieldLabel label="Category" required />
                  <Select
                    value={category}
                    onValueChange={(value) => {
                      setCategory(value);
                      markDirty();
                    }}
                  >
                    <SelectTrigger aria-label="Category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOG_CATEGORIES.map((item) => (
                        <SelectItem key={item.slug} value={item.name}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FieldLabel htmlFor="author" label="Author" required />
                  <Input
                    id="author"
                    value={author}
                    onChange={(event) => {
                      setAuthor(event.target.value);
                      markDirty();
                    }}
                    placeholder="Select author"
                  />
                </div>
              </SettingsSection>

              <section className="overflow-hidden rounded-xl border bg-background shadow-sm">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50">
                      <Code2 className="h-3.5 w-3.5" />
                    </span>
                    Schema – JSON-LD Preview
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => setSchemaEditorOpen((open) => !open)}
                  >
                    {schemaEditorOpen ? "Close" : "Edit JSON"}
                    {schemaEditorOpen ? <X className="h-3.5 w-3.5" /> : null}
                  </Button>
                </div>
                <div className="px-4 pb-4">
                  {schemaEditorOpen ? (
                    <div className="space-y-3">
                      <Textarea
                        value={schemaJson}
                        onChange={(event) => {
                          setSchemaEdited(true);
                          setSchemaJson(event.target.value);
                          markDirty();
                        }}
                        rows={14}
                        spellCheck={false}
                        aria-label="Structured schema JSON"
                        className="min-h-64 resize-y bg-slate-950 font-mono text-xs text-slate-100"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSchemaEdited(false);
                            setSchemaJson(formatStructuredData(generatedSchema));
                            markDirty();
                          }}
                        >
                          Regenerate
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Copy structured schema"
                          onClick={() => void copySchemaJson()}
                        >
                          {schemaCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <pre className="max-h-36 overflow-hidden whitespace-pre-wrap rounded-lg bg-slate-950 p-4 font-mono text-[11px] leading-5 text-slate-200">
                      {schemaJson}
                    </pre>
                  )}
                </div>
              </section>

              <section className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Label htmlFor="no-index">Noindex this post</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground" aria-label="Noindex help">
                        <HelpCircle className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      Ask search engines not to show this post in search results.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  id="no-index"
                  checked={noIndex}
                  onCheckedChange={(value) => {
                    setNoIndex(value);
                    markDirty();
                  }}
                />
              </section>
            </div>
          </aside>
        </div>
      </BlogEditorShell>
    </TooltipProvider>
  );
}
