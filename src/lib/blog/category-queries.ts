import { supabaseAdmin } from "@/lib/supabase/server";
import type { BlogCategory, BlogCategoryInput } from "./categories";
import { slugify } from "./utils";

const CATEGORY_SELECT = "id,name,slug,description,sort_order,created_at,updated_at";

export async function listBlogCategories(): Promise<BlogCategory[]> {
  const { data, error } = await supabaseAdmin
    .from("blog_categories")
    .select(CATEGORY_SELECT)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getBlogCategoryBySlug(slug: string): Promise<BlogCategory | null> {
  const { data, error } = await supabaseAdmin
    .from("blog_categories")
    .select(CATEGORY_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getBlogCategoryByName(name: string): Promise<BlogCategory | null> {
  const { data, error } = await supabaseAdmin
    .from("blog_categories")
    .select(CATEGORY_SELECT)
    .eq("name", name)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getBlogCategoryById(id: string): Promise<BlogCategory | null> {
  const { data, error } = await supabaseAdmin
    .from("blog_categories")
    .select(CATEGORY_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function countBlogsInCategory(name: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("blogs")
    .select("id", { count: "exact", head: true })
    .eq("category", name);

  if (error) throw error;
  return count ?? 0;
}

export async function createBlogCategory(input: BlogCategoryInput): Promise<BlogCategory> {
  const name = input.name.trim();
  const slug = slugify(input.slug || name);
  const description = input.description?.trim() ?? "";

  if (!name || !slug) {
    throw new Error("Category name is required");
  }

  const { data, error } = await supabaseAdmin
    .from("blog_categories")
    .insert({
      name,
      slug,
      description,
      sort_order: input.sort_order ?? 0,
    })
    .select(CATEGORY_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateBlogCategory(
  id: string,
  input: Partial<BlogCategoryInput>
): Promise<BlogCategory> {
  const existing = await getBlogCategoryById(id);
  if (!existing) {
    throw new Error("Category not found");
  }

  const nextName = input.name?.trim() ?? existing.name;
  const nextSlug = slugify(input.slug || nextName);
  const nextDescription = input.description?.trim() ?? existing.description;

  if (!nextName || !nextSlug) {
    throw new Error("Category name is required");
  }

  const { data, error } = await supabaseAdmin
    .from("blog_categories")
    .update({
      name: nextName,
      slug: nextSlug,
      description: nextDescription,
      sort_order: input.sort_order ?? existing.sort_order,
    })
    .eq("id", id)
    .select(CATEGORY_SELECT)
    .single();

  if (error) throw error;

  if (nextName !== existing.name) {
    await supabaseAdmin.from("blogs").update({ category: nextName }).eq("category", existing.name);
    await supabaseAdmin
      .from("blog_drafts")
      .update({ category: nextName })
      .eq("category", existing.name);
  }

  return data;
}

export async function deleteBlogCategory(id: string): Promise<void> {
  const existing = await getBlogCategoryById(id);
  if (!existing) {
    throw new Error("Category not found");
  }

  const blogCount = await countBlogsInCategory(existing.name);
  if (blogCount > 0) {
    throw new Error(`Cannot delete category used by ${blogCount} blog post(s)`);
  }

  const { error } = await supabaseAdmin.from("blog_categories").delete().eq("id", id);
  if (error) throw error;
}
