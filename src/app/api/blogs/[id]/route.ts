import { NextResponse } from "next/server";
import { z } from "zod";

import { isBlogCategorySlug } from "@/lib/blog/categories";
import {
  deleteBlog,
  getBlogById,
  isSlugAvailable,
  updateBlog,
} from "@/lib/blog/queries";
import { buildAutoStructuredData } from "@/lib/blog/structured-data";
import type { BlogFaq, BlogUpsertInput } from "@/lib/blog/types";
import { estimateReadingTime, parseFaqs, slugifyTitle } from "@/lib/blog/utils";

const faqSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

const upsertSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().min(2).max(120).optional(),
  excerpt: z.string().trim().min(1).max(500),
  content: z.string().trim().min(1),
  cover_image: z.string().nullable().optional(),
  cover_image_alt: z.string().trim().max(200).nullable().optional(),
  category: z.string().refine(isBlogCategorySlug, "Invalid category"),
  author: z.string().trim().min(1).max(120),
  author_avatar: z.string().nullable().optional(),
  status: z.enum(["draft", "published"]),
  nofollow: z.boolean().optional(),
  structured_data: z.unknown().nullable().optional(),
  faqs: z.array(faqSchema).nullable().optional(),
  published_at: z.string().nullable().optional(),
  reading_time: z.number().int().min(1).optional(),
});

type RouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

async function resolveId(params: RouteContext["params"]) {
  const resolved = params instanceof Promise ? await params : params;
  return resolved.id;
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const id = await resolveId(context.params);
    const post = await getBlogById(id);
    if (!post) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (error) {
    console.error("getBlog error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load blog" },
      { status: 400 }
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  try {
    const id = await resolveId(context.params);
    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await getBlogById(id);
    if (!existing) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    const data = parsed.data;
    const slug = slugifyTitle(data.slug || data.title);
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const available = await isSlugAvailable(slug, id);
    if (!available) {
      return NextResponse.json(
        { error: "Slug is already in use" },
        { status: 409 }
      );
    }

    const faqs = data.faqs ? parseFaqs(data.faqs) : null;
    const readingTime =
      data.reading_time ?? estimateReadingTime(data.content);

    let structuredData = data.structured_data ?? null;
    if (structuredData === undefined || structuredData === null) {
      structuredData = buildAutoStructuredData({
        title: data.title,
        slug,
        excerpt: data.excerpt,
        coverImage: data.cover_image,
        coverImageAlt: data.cover_image_alt,
        author: data.author,
        authorAvatar: data.author_avatar,
        category: data.category,
        publishedAt:
          data.status === "published"
            ? data.published_at ?? existing.published_at ?? new Date().toISOString()
            : data.published_at ?? existing.published_at,
        updatedAt: new Date().toISOString(),
        faqs: faqs ?? [],
      });
    }

    const input: BlogUpsertInput = {
      title: data.title,
      slug,
      excerpt: data.excerpt,
      content: data.content,
      cover_image: data.cover_image ?? null,
      cover_image_alt: data.cover_image_alt ?? null,
      category: data.category,
      author: data.author,
      author_avatar: data.author_avatar ?? null,
      status: data.status,
      nofollow: data.nofollow ?? false,
      structured_data: structuredData as BlogUpsertInput["structured_data"],
      faqs: faqs as BlogFaq[] | null,
      published_at: data.published_at,
      reading_time: readingTime,
    };

    const post = await updateBlog(id, input);
    return NextResponse.json(post);
  } catch (error) {
    console.error("updateBlog error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update blog",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const id = await resolveId(context.params);
    await deleteBlog(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("deleteBlog error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete blog",
      },
      { status: 400 }
    );
  }
}
