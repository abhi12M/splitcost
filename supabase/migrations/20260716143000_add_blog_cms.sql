CREATE TYPE public.blog_status AS ENUM ('draft', 'published');

CREATE TABLE public.blogs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text,
  slug text,
  excerpt text,
  content text DEFAULT '',
  cover_image text,
  category text,
  author text DEFAULT 'SplitCost Team',
  status public.blog_status NOT NULL DEFAULT 'draft',
  published_at timestamp with time zone,
  reading_time integer NOT NULL DEFAULT 1,
  views integer NOT NULL DEFAULT 0,
  no_index boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  schema_json jsonb,
  cover_alt text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blogs_pkey PRIMARY KEY (id),
  CONSTRAINT blogs_slug_key UNIQUE (slug),
  CONSTRAINT blogs_reading_time_positive CHECK (reading_time > 0),
  CONSTRAINT blogs_views_nonnegative CHECK (views >= 0)
);


CREATE INDEX blogs_status_published_at_idx
ON public.blogs (status, published_at DESC);

CREATE INDEX blogs_category_status_idx
ON public.blogs (category, status, published_at DESC);

CREATE INDEX blogs_views_idx
ON public.blogs (views DESC);

CREATE INDEX blogs_featured_status_published_at_idx
ON public.blogs (is_featured DESC, status, published_at DESC);

CREATE OR REPLACE FUNCTION public.set_blog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_blog_updated_at
BEFORE UPDATE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.set_blog_updated_at();

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;


INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public blog image reads"
ON storage.objects
FOR SELECT
USING (bucket_id = 'blog-images');

CREATE POLICY "Allow blog image uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "Allow blog image updates"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'blog-images')
WITH CHECK (bucket_id = 'blog-images');

CREATE POLICY "Allow blog image deletes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'blog-images');

-- Published posts remain the public source of truth. Revisions are stored
-- separately until an editor explicitly publishes them.
CREATE TABLE public.blog_drafts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  title text,
  slug text,
  excerpt text,
  content text NOT NULL DEFAULT '',
  cover_image text,
  cover_alt text,
  category text,
  author text,
  published_at timestamp with time zone,
  reading_time integer NOT NULL DEFAULT 1,
  no_index boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  schema_json jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blog_drafts_pkey PRIMARY KEY (id),
  CONSTRAINT blog_drafts_blog_id_key UNIQUE (blog_id),
  CONSTRAINT blog_drafts_reading_time_positive CHECK (reading_time > 0)
);

CREATE OR REPLACE FUNCTION public.set_blog_draft_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_blog_drafts_updated_at
BEFORE UPDATE ON public.blog_drafts
FOR EACH ROW
EXECUTE FUNCTION public.set_blog_draft_updated_at();

CREATE POLICY "Allow all access to blogs"
ON public.blogs
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access to blog drafts"
ON public.blog_drafts
FOR ALL
USING (true)
WITH CHECK (true);

ALTER TABLE public.blog_drafts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.increment_blog_view(p_blog_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.blogs
  SET views = views + 1
  WHERE id = p_blog_id
    AND status = 'published';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;


CREATE TABLE public.blog_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blog_categories_pkey PRIMARY KEY (id),
  CONSTRAINT blog_categories_slug_key UNIQUE (slug),
  CONSTRAINT blog_categories_name_key UNIQUE (name)
);

CREATE INDEX blog_categories_sort_order_idx
ON public.blog_categories (sort_order, name);

CREATE OR REPLACE FUNCTION public.set_blog_category_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_blog_category_updated_at
BEFORE UPDATE ON public.blog_categories
FOR EACH ROW
EXECUTE FUNCTION public.set_blog_category_updated_at();

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to blog categories"
ON public.blog_categories
FOR ALL
USING (true)
WITH CHECK (true);

INSERT INTO public.blog_categories (name, slug, description, sort_order) VALUES
  ('Travel', 'travel', 'Guides for planning trips, tracking shared travel costs, and settling up with groups.', 1),
  ('Expense Splitting', 'expense-splitting', 'Practical advice for splitting bills fairly with friends, families, and teams.', 2),
  ('Personal Finance', 'personal-finance', 'Simple money habits and personal finance tips for everyday shared expenses.', 3),
  ('Budgeting', 'budgeting', 'Budgeting ideas for trips, households, events, and recurring group costs.', 4),
  ('Roommates', 'roommates', 'Advice for rent, utilities, groceries, and keeping shared homes financially calm.', 5),
  ('Couples', 'couples', 'Ways couples can manage shared costs, dates, trips, and household spending.', 6),
  ('Business Expenses', 'business-expenses', 'Tips for tracking reimbursements, team expenses, client costs, and work trips.', 7),
  ('Events', 'events', 'Planning and splitting costs for parties, weddings, weekends, and group events.', 8);


