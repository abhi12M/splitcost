import { z } from "zod";

import type { BlogInput } from "./types";
import { estimateReadingTime, slugify } from "./utils";

const blogInputSchema = z.object({
  title: z.string().nullable(),
  slug: z.string().nullable(),
  excerpt: z.string().nullable(),
  content: z.string(),
  cover_image: z.string().nullable().optional(),
  cover_alt: z.string().nullable().optional(),
  category: z.string().nullable(),
  author: z.string().nullable(),
  status: z.enum(["draft", "published"]),
  reading_time: z.number().int().positive().optional(),
  no_index: z.boolean().optional(),
  is_featured: z.boolean().optional(),
});

export function normalizeBlogInput(body: unknown): BlogInput {
  const parsed = blogInputSchema.parse(body);
  return {
    title: parsed.title?.trim() || null,
    slug: slugify(parsed.slug || parsed.title || "") || null,
    excerpt: parsed.excerpt?.trim() || null,
    content: parsed.content,
    cover_image: parsed.cover_image ?? null,
    cover_alt: parsed.cover_alt?.trim() || null,
    category: parsed.category?.trim() || null,
    author: parsed.author?.trim() || "SplitCost Team",
    status: parsed.status,
    reading_time: parsed.reading_time ?? estimateReadingTime(parsed.content),
    no_index: parsed.no_index ?? false,
    is_featured: parsed.is_featured ?? false,
  };
}

