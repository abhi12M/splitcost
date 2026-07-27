import type { BlogCategorySlug } from "@/lib/blog/categories";
import type { Json } from "@/integrations/supabase/types";

export type BlogStatus = "draft" | "published";

export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  cover_image_alt: string | null;
  category: BlogCategorySlug | string;
  author: string;
  author_avatar: string | null;
  status: BlogStatus;
  nofollow: boolean;
  structured_data: Json | null;
  faqs: BlogFaq[] | null;
  published_at: string | null;
  reading_time: number;
  views: number;
  created_at: string;
  updated_at: string;
};

export type BlogListItem = Pick<
  BlogPost,
  | "id"
  | "title"
  | "slug"
  | "excerpt"
  | "cover_image"
  | "cover_image_alt"
  | "category"
  | "author"
  | "author_avatar"
  | "status"
  | "nofollow"
  | "published_at"
  | "reading_time"
  | "views"
  | "created_at"
  | "updated_at"
>;

export type BlogSort = "latest" | "popular";

export type BlogListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  sort?: BlogSort;
  status?: BlogStatus | "all";
};

export type BlogListResult = {
  items: BlogListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type BlogUpsertInput = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image?: string | null;
  cover_image_alt?: string | null;
  category: string;
  author: string;
  author_avatar?: string | null;
  status: BlogStatus;
  nofollow?: boolean;
  structured_data?: Json | null;
  faqs?: BlogFaq[] | null;
  published_at?: string | null;
  reading_time?: number;
};

export const BLOG_PAGE_SIZE = 9;
export const BLOG_IMAGES_BUCKET = "blog-images";
export const MAX_BLOG_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
