"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Save } from "lucide-react";

import { BlogEditor } from "@/components/admin/blog/BlogEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { buildAutoStructuredData } from "@/lib/blog/structured-data";
import type { BlogFaq, BlogPost, BlogStatus } from "@/lib/blog/types";
import { estimateReadingTime, parseFaqs, slugifyTitle } from "@/lib/blog/utils";
import { ADMIN_BASE_PATH } from "@/lib/constants";

type BlogFormProps = {
  mode: "create" | "edit";
  initial?: BlogPost | null;
};

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  cover_image_alt: string;
  category: string;
  author: string;
  author_avatar: string;
  status: BlogStatus;
  nofollow: boolean;
  faqsText: string;
  structuredDataText: string;
};

function faqsToText(faqs: BlogFaq[] | null | undefined): string {
  if (!faqs?.length) return "";
  return JSON.stringify(faqs, null, 2);
}

function structuredToText(value: unknown): string {
  if (!value) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

export function BlogForm({ mode, initial }: BlogFormProps) {
  const router = useRouter();
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [structuredTouched, setStructuredTouched] = useState(
    Boolean(initial?.structured_data)
  );
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    excerpt: initial?.excerpt ?? "",
    content: initial?.content ?? "",
    cover_image: initial?.cover_image ?? "",
    cover_image_alt: initial?.cover_image_alt ?? "",
    category: initial?.category ?? BLOG_CATEGORIES[0].slug,
    author: initial?.author ?? "SplitCost Team",
    author_avatar: initial?.author_avatar ?? "",
    status: initial?.status ?? "draft",
    nofollow: initial?.nofollow ?? false,
    faqsText: faqsToText(initial?.faqs),
    structuredDataText: structuredToText(initial?.structured_data),
  });

  const readingTime = useMemo(
    () => estimateReadingTime(form.content),
    [form.content]
  );

  const autoStructured = useMemo(() => {
    let faqs: BlogFaq[] = [];
    if (form.faqsText.trim()) {
      try {
        faqs = parseFaqs(JSON.parse(form.faqsText));
      } catch {
        faqs = [];
      }
    }
    const slug = form.slug || slugifyTitle(form.title);
    if (!form.title.trim() || !slug) return null;

    return buildAutoStructuredData({
      title: form.title.trim(),
      slug,
      excerpt: form.excerpt.trim(),
      coverImage: form.cover_image || null,
      coverImageAlt: form.cover_image_alt || null,
      author: form.author.trim() || "SplitCost Team",
      authorAvatar: form.author_avatar || null,
      category: form.category,
      publishedAt:
        form.status === "published"
          ? initial?.published_at ?? new Date().toISOString()
          : initial?.published_at,
      updatedAt: new Date().toISOString(),
      faqs,
    });
  }, [
    form.title,
    form.slug,
    form.excerpt,
    form.cover_image,
    form.cover_image_alt,
    form.author,
    form.author_avatar,
    form.category,
    form.status,
    form.faqsText,
    initial?.published_at,
  ]);

  useEffect(() => {
    if (!slugTouched) {
      setForm((prev) => ({ ...prev, slug: slugifyTitle(prev.title) }));
    }
  }, [form.title, slugTouched]);

  useEffect(() => {
    if (!structuredTouched && autoStructured) {
      setForm((prev) => ({
        ...prev,
        structuredDataText: JSON.stringify(autoStructured, null, 2),
      }));
    }
  }, [autoStructured, structuredTouched]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const uploadCover = async (file: File) => {
    setUploadingCover(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (form.cover_image_alt) formData.append("alt", form.cover_image_alt);
      const response = await fetch("/api/blog-images", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Cover upload failed");
      updateField("cover_image", payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cover upload failed");
    } finally {
      setUploadingCover(false);
    }
  };

  const regenerateStructuredData = () => {
    if (!autoStructured) return;
    setStructuredTouched(false);
    updateField("structuredDataText", JSON.stringify(autoStructured, null, 2));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const faqs = form.faqsText.trim()
        ? parseFaqs(safeJsonParse(form.faqsText))
        : [];

      let structured_data: unknown = null;
      if (form.structuredDataText.trim()) {
        structured_data = safeJsonParse(form.structuredDataText);
      } else if (autoStructured) {
        structured_data = autoStructured;
      }

      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugifyTitle(form.title),
        excerpt: form.excerpt.trim(),
        content: form.content,
        cover_image: form.cover_image || null,
        cover_image_alt: form.cover_image_alt.trim() || null,
        category: form.category,
        author: form.author.trim(),
        author_avatar: form.author_avatar || null,
        status: form.status,
        nofollow: form.nofollow,
        faqs: faqs.length ? faqs : null,
        structured_data,
        reading_time: readingTime,
      };

      const response = await fetch(
        mode === "create"
          ? "/api/blogs"
          : `/api/blogs/${initial?.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to save blog");
      }

      router.push(`${ADMIN_BASE_PATH}/blogs`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save blog");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="blog-title">Title / meta title</Label>
          <Input
            id="blog-title"
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="How to split travel expenses fairly"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="blog-slug">Slug</Label>
          <Input
            id="blog-slug"
            value={form.slug}
            onChange={(event) => {
              setSlugTouched(true);
              updateField("slug", slugifyTitle(event.target.value));
            }}
            placeholder="auto-generated-from-title"
            required
          />
          <p className="text-xs text-muted-foreground">
            Auto-generated from the title. Edit anytime.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-excerpt">Excerpt / meta description</Label>
        <Textarea
          id="blog-excerpt"
          value={form.excerpt}
          onChange={(event) => updateField("excerpt", event.target.value)}
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <BlogEditor
          value={form.content}
          onChange={(html) => updateField("content", html)}
        />
        <p className="text-xs text-muted-foreground">
          Estimated reading time: {readingTime} min
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="blog-category">Category</Label>
          <Select
            value={form.category}
            onValueChange={(value) => updateField("category", value)}
          >
            <SelectTrigger id="blog-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {BLOG_CATEGORIES.map((category) => (
                <SelectItem key={category.slug} value={category.slug}>
                  {category.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="blog-status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(value) =>
              updateField("status", value as BlogStatus)
            }
          >
            <SelectTrigger id="blog-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="blog-author">Author</Label>
          <Input
            id="blog-author"
            value={form.author}
            onChange={(event) => updateField("author", event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="blog-author-avatar">Author avatar URL</Label>
          <Input
            id="blog-author-avatar"
            value={form.author_avatar}
            onChange={(event) => updateField("author_avatar", event.target.value)}
            placeholder="Optional profile image URL"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="blog-cover">Cover image</Label>
          <Input
            id="blog-cover"
            value={form.cover_image}
            onChange={(event) => updateField("cover_image", event.target.value)}
            placeholder="https://…"
          />
          <Input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadCover(file);
            }}
          />
          {uploadingCover ? (
            <p className="text-xs text-muted-foreground">Uploading cover…</p>
          ) : null}
          {form.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.cover_image}
              alt={form.cover_image_alt || form.title || "Cover preview"}
              className="mt-2 max-h-48 rounded-xl border object-cover"
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="blog-cover-alt">Cover image alt text</Label>
          <Input
            id="blog-cover-alt"
            value={form.cover_image_alt}
            onChange={(event) =>
              updateField("cover_image_alt", event.target.value)
            }
            placeholder="Describe the cover image"
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-3">
        <div>
          <p className="font-medium text-foreground">Noindex / nofollow</p>
          <p className="text-sm text-muted-foreground">
            When enabled, this post is excluded from indexing and the sitemap.
          </p>
        </div>
        <Switch
          checked={form.nofollow}
          onCheckedChange={(checked) => updateField("nofollow", checked)}
          aria-label="Enable nofollow"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog-faqs">FAQs (JSON, optional)</Label>
        <Textarea
          id="blog-faqs"
          value={form.faqsText}
          onChange={(event) => updateField("faqsText", event.target.value)}
          rows={6}
          placeholder={`[\n  { "question": "…", "answer": "…" }\n]`}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          If provided, FAQPage structured data is included automatically.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="blog-structured">Structured data (JSON-LD)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={regenerateStructuredData}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Regenerate
          </Button>
        </div>
        <Textarea
          id="blog-structured"
          value={form.structuredDataText}
          onChange={(event) => {
            setStructuredTouched(true);
            updateField("structuredDataText", event.target.value);
          }}
          rows={14}
          className="font-mono text-xs"
        />
        <p className="text-xs text-muted-foreground">
          Auto-generated from title, slug, excerpt, author, category, and FAQs.
          Edit freely, or regenerate to reset.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving
            ? "Saving…"
            : mode === "create"
              ? "Create blog"
              : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`${ADMIN_BASE_PATH}/blogs`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Invalid JSON in FAQs or structured data");
  }
}
