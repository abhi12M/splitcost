export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BlogCategoryInput = {
  name: string;
  slug?: string;
  description?: string;
  sort_order?: number;
};
