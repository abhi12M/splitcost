export type BlogStatus = "draft" | "published";

export type Blog = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  cover_alt: string | null;
  category: string | null;
  author: string;
  status: BlogStatus;
  published_at: string | null;
  reading_time: number;
  no_index: boolean;
  is_featured: boolean;
  views: number;
  created_at: string;
  updated_at: string;
  /** Admin-only indicator that the published row has an unpublished revision. */
  has_draft_changes?: boolean;
};

export type BlogInput = {
  title: string | null;
  slug: string | null;
  excerpt: string | null;
  content: string;
  cover_image?: string | null;
  cover_alt?: string | null;
  category: string | null;
  author: string | null;
  status: BlogStatus;
  reading_time?: number;
  no_index?: boolean;
  is_featured?: boolean;
};

export type BlogAdminListItem = Pick<
  Blog,
  "id" | "title" | "slug" | "status" | "category" | "created_at" | "is_featured" | "views"
> & {
  has_draft_changes?: boolean;
};

export type BlogSort = "latest" | "popular";

export type BlogListResult = {
  blogs: Blog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
