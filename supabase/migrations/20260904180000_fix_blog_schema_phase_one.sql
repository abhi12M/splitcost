-- Keep the public modification timestamp tied to editorial changes. View-count
-- updates are analytics-only and must not make an article appear modified.
CREATE OR REPLACE FUNCTION public.set_blog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF ROW(
    NEW.title,
    NEW.slug,
    NEW.excerpt,
    NEW.content,
    NEW.cover_image,
    NEW.cover_alt,
    NEW.category,
    NEW.author,
    NEW.status,
    NEW.published_at,
    NEW.reading_time,
    NEW.no_index,
    NEW.is_featured
  ) IS DISTINCT FROM ROW(
    OLD.title,
    OLD.slug,
    OLD.excerpt,
    OLD.content,
    OLD.cover_image,
    OLD.cover_alt,
    OLD.category,
    OLD.author,
    OLD.status,
    OLD.published_at,
    OLD.reading_time,
    OLD.no_index,
    OLD.is_featured
  ) THEN
    NEW.updated_at = now();
  ELSE
    NEW.updated_at = OLD.updated_at;
  END IF;

  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at = now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TABLE public.blog_slug_redirects (
  old_slug text NOT NULL,
  blog_id uuid NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT blog_slug_redirects_pkey PRIMARY KEY (old_slug),
  CONSTRAINT blog_slug_redirects_old_slug_not_empty CHECK (length(btrim(old_slug)) > 0)
);

CREATE INDEX blog_slug_redirects_blog_id_idx
ON public.blog_slug_redirects (blog_id);

ALTER TABLE public.blog_slug_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public blog redirect reads"
ON public.blog_slug_redirects
FOR SELECT
USING (true);

-- Redirect rows store only the previous slug and blog identity. The destination
-- is always resolved from blogs.slug, so repeated changes cannot form chains.
CREATE OR REPLACE FUNCTION public.track_published_blog_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflicting_blog_id uuid;
BEGIN
  IF NEW.status = 'published' AND NEW.slug IS NOT NULL THEN
    SELECT redirect.blog_id
    INTO conflicting_blog_id
    FROM public.blog_slug_redirects AS redirect
    WHERE redirect.old_slug = NEW.slug;

    IF conflicting_blog_id IS NOT NULL AND conflicting_blog_id <> NEW.id THEN
      RAISE EXCEPTION 'Blog slug % is reserved by a published URL', NEW.slug
        USING ERRCODE = 'unique_violation';
    END IF;

    -- A post may deliberately return to one of its own previous slugs. That
    -- slug becomes canonical again and must stop acting as a redirect source.
    DELETE FROM public.blog_slug_redirects
    WHERE old_slug = NEW.slug
      AND blog_id = NEW.id;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.status = 'published'
    AND OLD.slug IS NOT NULL
    AND NEW.slug IS DISTINCT FROM OLD.slug
  THEN
    INSERT INTO public.blog_slug_redirects (old_slug, blog_id)
    VALUES (OLD.slug, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER track_published_blog_slug_on_insert
BEFORE INSERT ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.track_published_blog_slug();

CREATE TRIGGER track_published_blog_slug_on_update
BEFORE UPDATE OF slug, status ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.track_published_blog_slug();
