import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  Blog,
  BlogAdminListItem,
  BlogInput,
  BlogListResult,
  BlogSort,
} from "./types";

const BLOG_SELECT =
  "id,title,slug,excerpt,content,cover_image,cover_alt,category,author,status,published_at,reading_time,no_index,schema_json,views,created_at,updated_at";

type ListBlogsArgs = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  sort?: BlogSort;
  status?: "published" | "draft" | "all";
};

function normalizePage(value?: number) {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : 1;
}

export async function listBlogs({
  page = 1,
  pageSize = 9,
  search = "",
  category,
  sort = "latest",
  status = "published",
}: ListBlogsArgs = {}): Promise<BlogListResult> {
  const currentPage = normalizePage(page);
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabaseAdmin
    .from("blogs")
    .select(BLOG_SELECT, { count: "exact" });

  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (search.trim()) {
    const term = search.trim().replace(/[%_]/g, "");
    query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);
  }

  query =
    sort === "popular"
      ? query.order("views", { ascending: false }).order("published_at", {
          ascending: false,
          nullsFirst: false,
        })
      : query.order("published_at", {
          ascending: false,
          nullsFirst: false,
        });

  const { data, count, error } = await query.range(from, to);

  if (error) {
    console.error("listBlogs error:", error);
    return { blogs: [], total: 0, page: currentPage, pageSize, totalPages: 0 };
  }

  const total = count ?? 0;
  return {
    blogs: (data ?? []) as Blog[],
    total,
    page: currentPage,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function listAllBlogs(): Promise<Blog[]> {
  const { data, error } = await supabaseAdmin
    .from("blogs")
    .select(BLOG_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listAllBlogs error:", error);
    return [];
  }
  return (data ?? []) as Blog[];
}

export async function listBlogsForAdmin(): Promise<BlogAdminListItem[]> {
  const [blogsResult, draftsResult] = await Promise.all([
    supabaseAdmin
      .from("blogs")
      .select("id,title,slug,status,category,created_at")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("blog_drafts").select("blog_id"),
  ]);

  if (blogsResult.error) {
    console.error("listBlogsForAdmin error:", blogsResult.error);
    return [];
  }

  if (draftsResult.error) {
    console.error("listBlogsForAdmin drafts error:", draftsResult.error);
  }

  const draftBlogIds = new Set((draftsResult.data ?? []).map((draft) => draft.blog_id));
  return (blogsResult.data ?? []).map((blog) => ({
    ...blog,
    has_draft_changes: blog.status === "published" && draftBlogIds.has(blog.id),
  })) as BlogAdminListItem[];
}

export async function getBlogBySlug(slug: string): Promise<Blog | null> {
  const { data, error } = await supabaseAdmin
    .from("blogs")
    .select(BLOG_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    console.error("getBlogBySlug error:", error);
    return null;
  }
  return (data as Blog | null) ?? null;
}

export async function getBlogById(id: string): Promise<Blog | null> {
  const { data: blog, error } = await supabaseAdmin
    .from("blogs")
    .select(BLOG_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getBlogById error:", error);
    return null;
  }
  if (!blog) return null;

  // Admin editing should resume an unpublished revision, while public readers
  // continue to query only the canonical `blogs` table.
  if (blog.status !== "published") return blog as Blog;

  const { data: draft, error: draftError } = await supabaseAdmin
    .from("blog_drafts")
    .select("title,slug,excerpt,content,cover_image,cover_alt,category,author,published_at,reading_time,no_index,schema_json,updated_at")
    .eq("blog_id", id)
    .maybeSingle();

  if (draftError) {
    console.error("getBlogById draft error:", draftError);
    return blog as Blog;
  }

  return draft
    ? ({ ...blog, ...draft, has_draft_changes: true } as Blog)
    : (blog as Blog);
}

export async function createBlog(input: BlogInput): Promise<Blog> {
  const payload = {
    ...input,
    published_at:
      input.status === "published"
        ? input.published_at ?? new Date().toISOString()
        : input.published_at ?? null,
  };
  const { data, error } = await supabaseAdmin
    .from("blogs")
    .insert(payload)
    .select(BLOG_SELECT)
    .single();

  if (error) throw error;
  return data as Blog;
}

export async function updateBlog(id: string, input: BlogInput): Promise<Blog> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("blogs")
    .select(BLOG_SELECT)
    .eq("id", id)
    .single();

  if (existingError) throw existingError;

  // Saving a published post as a draft must never update its public row.
  if (existing.status === "published" && input.status === "draft") {
    const { status: _status, ...draftInput } = input;
    const { data: draft, error: draftError } = await supabaseAdmin
      .from("blog_drafts")
      .upsert(
        {
          blog_id: id,
          ...draftInput,
          published_at: existing.published_at,
        },
        { onConflict: "blog_id" }
      )
      .select("title,slug,excerpt,content,cover_image,cover_alt,category,author,published_at,reading_time,no_index,schema_json,updated_at")
      .single();

    if (draftError) throw draftError;
    return { ...existing, ...draft } as Blog;
  }

  const payload = {
    ...input,
    published_at:
      input.status === "published"
        ? existing.published_at ?? input.published_at ?? new Date().toISOString()
        : input.published_at ?? null,
  };
  const { data, error } = await supabaseAdmin
    .from("blogs")
    .update(payload)
    .eq("id", id)
    .select(BLOG_SELECT)
    .single();

  if (error) throw error;

  // A publish applies the revision to the canonical post, then clears it.
  if (existing.status === "published") {
    const { error: draftError } = await supabaseAdmin
      .from("blog_drafts")
      .delete()
      .eq("blog_id", id);
    if (draftError) throw draftError;
  }

  return data as Blog;
}

export async function deleteBlog(id: string) {
  const { error } = await supabaseAdmin.from("blogs").delete().eq("id", id);
  if (error) throw error;
}

export async function incrementBlogViews(id: string, views: number) {
  await supabaseAdmin
    .from("blogs")
    .update({ views: views + 1 })
    .eq("id", id);
}

export async function getRelatedBlogs(blog: Blog, limit = 3): Promise<Blog[]> {
  const [categoryResult, latestResult] = await Promise.all([
    supabaseAdmin
      .from("blogs")
      .select(BLOG_SELECT)
      .eq("status", "published")
      .eq("category", blog.category)
      .neq("id", blog.id)
      .order("published_at", { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from("blogs")
      .select(BLOG_SELECT)
      .eq("status", "published")
      .neq("id", blog.id)
      .order("published_at", { ascending: false })
      .limit(limit + 1),
  ]);

  if (categoryResult.error) {
    console.error("getRelatedBlogs category error:", categoryResult.error);
  }
  if (latestResult.error) {
    console.error("getRelatedBlogs latest error:", latestResult.error);
  }

  const related = [
    ...((categoryResult.data ?? []) as Blog[]),
    ...((latestResult.data ?? []) as Blog[]),
  ];

  return Array.from(new Map(related.map((item) => [item.id, item])).values()).slice(0, limit);
}

export async function getPublishedBlogPaths() {
  const { data, error } = await supabaseAdmin
    .from("blogs")
    .select("slug,updated_at,published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as Pick<Blog, "slug" | "updated_at" | "published_at">[];
}
