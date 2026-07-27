import { supabaseAdmin } from "@/lib/supabase/server";
import {
  BLOG_PAGE_SIZE,
  type BlogListItem,
  type BlogListParams,
  type BlogListResult,
  type BlogPost,
  type BlogStatus,
  type BlogUpsertInput,
} from "@/lib/blog/types";
import { estimateReadingTime, parseFaqs } from "@/lib/blog/utils";
import { isBlogCategorySlug } from "@/lib/blog/categories";

const LIST_COLUMNS =
  "id, title, slug, excerpt, cover_image, cover_image_alt, category, author, author_avatar, status, nofollow, published_at, reading_time, views, created_at, updated_at";

const DETAIL_COLUMNS = `${LIST_COLUMNS}, content, structured_data, faqs`;

function mapPost(row: Record<string, unknown>): BlogPost {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
    excerpt: String(row.excerpt ?? ""),
    content: String(row.content ?? ""),
    cover_image: (row.cover_image as string | null) ?? null,
    cover_image_alt: (row.cover_image_alt as string | null) ?? null,
    category: String(row.category ?? ""),
    author: String(row.author ?? "SplitCost Team"),
    author_avatar: (row.author_avatar as string | null) ?? null,
    status: (row.status as BlogStatus) ?? "draft",
    nofollow: Boolean(row.nofollow),
    structured_data: (row.structured_data as BlogPost["structured_data"]) ?? null,
    faqs: parseFaqs(row.faqs),
    published_at: (row.published_at as string | null) ?? null,
    reading_time: Number(row.reading_time ?? 1),
    views: Number(row.views ?? 0),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapListItem(row: Record<string, unknown>): BlogListItem {
  const post = mapPost(row);
  const {
    content: _content,
    structured_data: _structured,
    faqs: _faqs,
    ...item
  } = post;
  return item;
}

export async function listBlogs(
  params: BlogListParams = {}
): Promise<BlogListResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(50, params.pageSize ?? BLOG_PAGE_SIZE));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const status = params.status ?? "published";
  const sort = params.sort ?? "latest";
  const search = params.search?.trim();

  let query = supabaseAdmin
    .from("blogs")
    .select(LIST_COLUMNS, { count: "exact" });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (params.category && isBlogCategorySlug(params.category)) {
    query = query.eq("category", params.category);
  }

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,excerpt.ilike.%${search}%,content.ilike.%${search}%`
    );
  }

  if (sort === "popular") {
    query = query.order("views", { ascending: false }).order("published_at", {
      ascending: false,
      nullsFirst: false,
    });
  } else {
    query = query.order("published_at", { ascending: false, nullsFirst: false });
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    throw new Error(error.message || "Failed to list blogs");
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map((row) => mapListItem(row as Record<string, unknown>)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getBlogBySlug(
  slug: string,
  options: { includeDrafts?: boolean } = {}
): Promise<BlogPost | null> {
  const { data, error } = await supabaseAdmin
    .from("blogs")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load blog");
  }

  if (!data) return null;

  const post = mapPost(data as Record<string, unknown>);
  if (!options.includeDrafts && post.status !== "published") {
    return null;
  }

  return post;
}

export async function getBlogById(id: string): Promise<BlogPost | null> {
  const { data, error } = await supabaseAdmin
    .from("blogs")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load blog");
  }

  if (!data) return null;
  return mapPost(data as Record<string, unknown>);
}

export async function getAdjacentBlogs(post: BlogPost): Promise<{
  previous: BlogListItem | null;
  next: BlogListItem | null;
}> {
  if (!post.published_at) {
    return { previous: null, next: null };
  }

  const [previousResult, nextResult] = await Promise.all([
    supabaseAdmin
      .from("blogs")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .lt("published_at", post.published_at)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("blogs")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .gt("published_at", post.published_at)
      .order("published_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    previous: previousResult.data
      ? mapListItem(previousResult.data as Record<string, unknown>)
      : null,
    next: nextResult.data
      ? mapListItem(nextResult.data as Record<string, unknown>)
      : null,
  };
}

export async function getRelatedBlogs(
  post: BlogPost,
  limit = 3
): Promise<BlogListItem[]> {
  const { data: sameCategory } = await supabaseAdmin
    .from("blogs")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .eq("category", post.category)
    .neq("id", post.id)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  const related = (sameCategory ?? []).map((row) =>
    mapListItem(row as Record<string, unknown>)
  );

  if (related.length >= limit) {
    return related.slice(0, limit);
  }

  const excludeIds = [post.id, ...related.map((item) => item.id)];
  let latestQuery = supabaseAdmin
    .from("blogs")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit - related.length);

  if (excludeIds.length === 1) {
    latestQuery = latestQuery.neq("id", excludeIds[0]);
  } else if (excludeIds.length > 1) {
    latestQuery = latestQuery.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data: latest } = await latestQuery;

  return [
    ...related,
    ...(latest ?? []).map((row) => mapListItem(row as Record<string, unknown>)),
  ];
}

export async function getPublishedBlogSlugs(): Promise<
  { slug: string; updated_at: string; nofollow: boolean }[]
> {
  const { data, error } = await supabaseAdmin
    .from("blogs")
    .select("slug, updated_at, nofollow")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(error.message || "Failed to load blog slugs");
  }

  return (data ?? []).map((row) => ({
    slug: String(row.slug),
    updated_at: String(row.updated_at),
    nofollow: Boolean(row.nofollow),
  }));
}

export async function getBlogStats() {
  const [{ count: total }, { count: published }, { count: drafts }, recent] =
    await Promise.all([
      supabaseAdmin.from("blogs").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("blogs")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabaseAdmin
        .from("blogs")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft"),
      supabaseAdmin
        .from("blogs")
        .select(LIST_COLUMNS)
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

  return {
    total: total ?? 0,
    published: published ?? 0,
    drafts: drafts ?? 0,
    recent: (recent.data ?? []).map((row) =>
      mapListItem(row as Record<string, unknown>)
    ),
  };
}

export async function createBlog(input: BlogUpsertInput): Promise<BlogPost> {
  const readingTime = input.reading_time ?? estimateReadingTime(input.content);
  const publishedAt =
    input.status === "published"
      ? input.published_at ?? new Date().toISOString()
      : input.published_at ?? null;

  const { data, error } = await supabaseAdmin
    .from("blogs")
    .insert({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      cover_image: input.cover_image ?? null,
      cover_image_alt: input.cover_image_alt ?? null,
      category: input.category,
      author: input.author,
      author_avatar: input.author_avatar ?? null,
      status: input.status,
      nofollow: input.nofollow ?? false,
      structured_data: input.structured_data ?? null,
      faqs: input.faqs ?? null,
      published_at: publishedAt,
      reading_time: readingTime,
    })
    .select(DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || "Failed to create blog");
  }

  return mapPost(data as Record<string, unknown>);
}

export async function updateBlog(
  id: string,
  input: BlogUpsertInput
): Promise<BlogPost> {
  const existing = await getBlogById(id);
  if (!existing) {
    throw new Error("Blog not found");
  }

  const readingTime = input.reading_time ?? estimateReadingTime(input.content);
  let publishedAt = input.published_at ?? existing.published_at;
  if (input.status === "published" && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from("blogs")
    .update({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      cover_image: input.cover_image ?? null,
      cover_image_alt: input.cover_image_alt ?? null,
      category: input.category,
      author: input.author,
      author_avatar: input.author_avatar ?? null,
      status: input.status,
      nofollow: input.nofollow ?? false,
      structured_data: input.structured_data ?? null,
      faqs: input.faqs ?? null,
      published_at: publishedAt,
      reading_time: readingTime,
    })
    .eq("id", id)
    .select(DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message || "Failed to update blog");
  }

  return mapPost(data as Record<string, unknown>);
}

export async function deleteBlog(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("blogs").delete().eq("id", id);
  if (error) {
    throw new Error(error.message || "Failed to delete blog");
  }
}

export async function incrementBlogViews(id: string): Promise<void> {
  const { data } = await supabaseAdmin
    .from("blogs")
    .select("views")
    .eq("id", id)
    .maybeSingle();

  if (!data) return;

  await supabaseAdmin
    .from("blogs")
    .update({ views: Number(data.views ?? 0) + 1 })
    .eq("id", id);
}

export async function isSlugAvailable(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  let query = supabaseAdmin.from("blogs").select("id").eq("slug", slug);
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  const { data, error } = await query.maybeSingle();
  if (error && error.code !== "PGRST116") {
    throw new Error(error.message || "Failed to check slug");
  }
  return !data;
}
