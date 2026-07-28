import type { Json } from "@/integrations/supabase/types";

export type BlogStatus = "draft" | "published";

export type Blog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  category: string;
  author: string;
  status: BlogStatus;
  published_at: string | null;
  reading_time: number;
  no_index: boolean;
  schema_json: Json | null;
  views: number;
  created_at: string;
  updated_at: string;
};

export type BlogInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image?: string | null;
  category: string;
  author: string;
  status: BlogStatus;
  published_at?: string | null;
  reading_time?: number;
  no_index?: boolean;
  schema_json?: Json | null;
};

export type BlogAdminListItem = Pick<
  Blog,
  "id" | "title" | "slug" | "status" | "category" | "created_at"
>;

export type BlogSort = "latest" | "popular";

export type BlogListResult = {
  blogs: Blog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
