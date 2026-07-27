-- Blog CMS: posts, status enum, storage bucket for cover/inline images

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'blog_status'
  ) THEN
    CREATE TYPE public.blog_status AS ENUM ('draft', 'published');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  cover_image text,
  cover_image_alt text,
  category text NOT NULL,
  author text NOT NULL DEFAULT 'SplitCost Team',
  author_avatar text,
  status public.blog_status NOT NULL DEFAULT 'draft',
  nofollow boolean NOT NULL DEFAULT false,
  structured_data jsonb,
  faqs jsonb,
  published_at timestamptz,
  reading_time integer NOT NULL DEFAULT 1,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blogs_slug_unique UNIQUE (slug),
  CONSTRAINT blogs_reading_time_positive CHECK (reading_time >= 1),
  CONSTRAINT blogs_views_non_negative CHECK (views >= 0)
);

CREATE INDEX IF NOT EXISTS blogs_status_published_at_idx
  ON public.blogs (status, published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS blogs_category_status_idx
  ON public.blogs (category, status);

CREATE INDEX IF NOT EXISTS blogs_views_idx
  ON public.blogs (views DESC);

CREATE OR REPLACE FUNCTION public.set_blogs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blogs_set_updated_at ON public.blogs;
CREATE TRIGGER blogs_set_updated_at
  BEFORE UPDATE ON public.blogs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_blogs_updated_at();

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published blogs" ON public.blogs;
CREATE POLICY "Public can read published blogs"
  ON public.blogs
  FOR SELECT
  USING (status = 'published' OR true);

DROP POLICY IF EXISTS "Allow blog inserts" ON public.blogs;
CREATE POLICY "Allow blog inserts"
  ON public.blogs
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow blog updates" ON public.blogs;
CREATE POLICY "Allow blog updates"
  ON public.blogs
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow blog deletes" ON public.blogs;
CREATE POLICY "Allow blog deletes"
  ON public.blogs
  FOR DELETE
  USING (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('blog-images', 'blog-images', true, 5242880)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public read blog images'
  ) THEN
    CREATE POLICY "Allow public read blog images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'blog-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public write blog images'
  ) THEN
    CREATE POLICY "Allow public write blog images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'blog-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public update blog images'
  ) THEN
    CREATE POLICY "Allow public update blog images"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'blog-images')
    WITH CHECK (bucket_id = 'blog-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public delete blog images'
  ) THEN
    CREATE POLICY "Allow public delete blog images"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'blog-images');
  END IF;
END $$;
