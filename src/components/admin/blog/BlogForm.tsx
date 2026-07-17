"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { BLOG_CATEGORIES } from "@/lib/blog/categories";
import type { Blog, BlogInput, BlogStatus } from "@/lib/blog/types";
import { estimateReadingTime, slugify } from "@/lib/blog/utils";
import { ADMIN_BASE_PATH } from "@/lib/constants";
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
import { Textarea } from "@/components/ui/textarea";
import { BlogEditor } from "./BlogEditor";

export function BlogForm({ blog }: { blog?: Blog | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(blog?.title ?? "");
  const [slug, setSlug] = useState(blog?.slug ?? "");
  const [excerpt, setExcerpt] = useState(blog?.excerpt ?? "");
  const [content, setContent] = useState(blog?.content ?? "");
  const [coverImage, setCoverImage] = useState(blog?.cover_image ?? "");
  const [category, setCategory] = useState(blog?.category ?? BLOG_CATEGORIES[0].name);
  const [author, setAuthor] = useState(blog?.author ?? "SplitCost Team");
  const [status, setStatus] = useState<BlogStatus>(blog?.status ?? "draft");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const readingTime = useMemo(() => estimateReadingTime(content), [content]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!blog && !slug) setSlug(slugify(value));
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="excerpt">SEO description and excerpt</Label>
            <Textarea id="excerpt" value={excerpt} onChange={(event) => setExcerpt(event.target.value)} rows={3} required />
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
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save blog"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
