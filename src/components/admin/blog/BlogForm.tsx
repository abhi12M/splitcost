"use client";

import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import { buildBlogStructuredData, formatStructuredData } from "@/lib/blog/schema";
import { buildBlogTableOfContents } from "@/lib/blog/toc";
import type { Blog, BlogInput, BlogStatus } from "@/lib/blog/types";
import { estimateReadingTime, slugify } from "@/lib/blog/utils";
import { ADMIN_BASE_PATH } from "@/lib/constants";
import { BlogTableOfContents } from "@/components/blog/BlogTableOfContents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { BlogEditor } from "./BlogEditor";

const TITLE_MAX = 60;
const EXCERPT_MAX = 160;

function CharacterCounter({ value, max }: { value: string; max: number }) {
  const overLimit = value.length > max;
  return (
    <p className={`text-right text-xs ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
      {value.length}/{max}
    </p>
  );
}

export function BlogForm({ blog }: { blog?: Blog | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(blog?.title ?? "");
  const [slug, setSlug] = useState(blog?.slug ?? "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(blog?.slug));
  const [excerpt, setExcerpt] = useState(blog?.excerpt ?? "");
  const [content, setContent] = useState(blog?.content ?? "");
  const [coverImage, setCoverImage] = useState(blog?.cover_image ?? "");
  const [category, setCategory] = useState(blog?.category ?? BLOG_CATEGORIES[0].name);
  const [author, setAuthor] = useState(blog?.author ?? "SplitCost Team");
  const [status, setStatus] = useState<BlogStatus>(blog?.status ?? "draft");
  const [noIndex, setNoIndex] = useState(blog?.no_index ?? false);
  const [schemaEdited, setSchemaEdited] = useState(Boolean(blog?.schema_json));
  const [schemaCopied, setSchemaCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const readingTime = useMemo(() => estimateReadingTime(content), [content]);
  const generatedSchema = useMemo(
    () =>
      buildBlogStructuredData({
        title: title.trim() || "Blog title",
        slug: slugify(slug || title || "blog-title"),
        excerpt: excerpt.trim(),
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
    formatStructuredData(blog?.schema_json ?? generatedSchema)
  );
  const generatedToc = useMemo(() => buildBlogTableOfContents(content), [content]);

  useEffect(() => {
    if (!schemaEdited) setSchemaJson(formatStructuredData(generatedSchema));
  }, [generatedSchema, schemaEdited]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugManuallyEdited) setSlug(slugify(value));
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

  const uploadCover = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/blog-images", { method: "POST", body: form });
    if (!response.ok) return;
    const data = (await response.json()) as { url: string };
    setCoverImage(data.url);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    let parsedSchema: BlogInput["schema_json"] = null;
    if (schemaJson.trim()) {
      try {
        parsedSchema = JSON.parse(schemaJson);
      } catch {
        setSaving(false);
        setError("Structured schema must be valid JSON.");
        return;
      }
    }

    const payload: BlogInput = {
      title: title.trim(),
      slug: slugify(slug || title),
      excerpt: excerpt.trim(),
      content,
      cover_image: coverImage || null,
      category,
      author: author.trim() || "SplitCost Team",
      status,
      published_at: blog?.published_at ?? null,
      reading_time: readingTime,
      no_index: noIndex,
      schema_json: parsedSchema,
    };

    const response = await fetch(blog ? `/api/blogs/${blog.id}` : "/api/blogs", {
      method: blog ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Unable to save blog");
      return;
    }

    router.push(`${ADMIN_BASE_PATH}/blogs`);
    router.refresh();
  };

  return (
    <form className="grid gap-6 lg:grid-cols-[1fr_320px]" onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{blog ? "Edit blog" : "Create blog"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(event) => handleTitleChange(event.target.value)} required />
            <CharacterCounter value={title} max={TITLE_MAX} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(event) => {
                setSlugManuallyEdited(true);
                setSlug(event.target.value);
              }}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="excerpt">SEO description and excerpt</Label>
            <Textarea
              id="excerpt"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              rows={3}
              className="min-h-[5rem] h-[5rem] sm:min-h-[5rem] sm:h-[5rem]"
              required
            />
            <CharacterCounter value={excerpt} max={EXCERPT_MAX} />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <BlogEditor value={content} onChange={setContent} />
          </div>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Publish settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as BlogStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
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
              <Input id="author" value={author} onChange={(event) => setAuthor(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cover">Cover image</Label>
              <Input id="cover" value={coverImage} onChange={(event) => setCoverImage(event.target.value)} placeholder="https://..." />
              <Input type="file" accept="image/*" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadCover(file);
              }} />
            </div>
            <p className="text-sm text-muted-foreground">{readingTime} min read</p>
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div className="space-y-1">
                <Label htmlFor="no-index">Noindex, follow</Label>
                <p className="text-xs text-muted-foreground">Ask search engines not to index this post.</p>
              </div>
              <Switch id="no-index" checked={noIndex} onCheckedChange={setNoIndex} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save blog"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Table of contents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-card p-4">
              <BlogTableOfContents headings={generatedToc} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Structured schema</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Copy structured schema"
              onClick={() => void copySchemaJson()}
            >
              {schemaCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={schemaJson}
              onChange={(event) => {
                setSchemaEdited(true);
                setSchemaJson(event.target.value);
              }}
              rows={18}
              spellCheck={false}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setSchemaEdited(false);
                setSchemaJson(formatStructuredData(generatedSchema));
              }}
            >
              Regenerate schema
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
