-- Phase 1A: serialize ownership changes only for the slugs involved. This
-- closes the cross-table race between blogs.slug and redirect history without
-- globally serializing unrelated blog updates.
CREATE OR REPLACE FUNCTION public.track_published_blog_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflicting_blog_id uuid;
  locked_slug text;
BEGIN
  FOR locked_slug IN
    SELECT DISTINCT candidate.slug
    FROM unnest(
      CASE
        WHEN TG_OP = 'INSERT' THEN ARRAY[NEW.slug]
        ELSE ARRAY[OLD.slug, NEW.slug]
      END
    ) AS candidate(slug)
    WHERE candidate.slug IS NOT NULL
    ORDER BY candidate.slug
  LOOP
    PERFORM pg_advisory_xact_lock(
      hashtextextended('splitcost:blog-public-slug:' || locked_slug, 0)
    );
  END LOOP;

  IF NEW.status = 'published' AND NEW.slug IS NOT NULL THEN
    SELECT redirect.blog_id
    INTO conflicting_blog_id
    FROM public.blog_slug_redirects AS redirect
    WHERE redirect.old_slug = NEW.slug;

    IF FOUND AND (conflicting_blog_id IS NULL OR conflicting_blog_id <> NEW.id) THEN
      RAISE EXCEPTION 'Blog slug % is reserved by a published URL', NEW.slug
        USING ERRCODE = 'unique_violation';
    END IF;

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

-- Publication metadata is established only by an explicit transition to the
-- published state. Analytics updates to malformed legacy rows must not invent
-- a publication date.
CREATE OR REPLACE FUNCTION public.set_blog_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status <> 'published'
    AND NEW.status = 'published'
    AND NEW.published_at IS NULL
  THEN
    NEW.published_at = now();
  END IF;

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

  RETURN NEW;
END;
$$;

-- Preserve historical public URL ownership after deletion. A null blog_id is
-- a tombstone: it intentionally resolves to 404 while permanently reserving
-- the old URL from unrelated content.
ALTER TABLE public.blog_slug_redirects
  DROP CONSTRAINT blog_slug_redirects_blog_id_fkey;

ALTER TABLE public.blog_slug_redirects
  ALTER COLUMN blog_id DROP NOT NULL;

ALTER TABLE public.blog_slug_redirects
  ADD CONSTRAINT blog_slug_redirects_blog_id_fkey
  FOREIGN KEY (blog_id) REFERENCES public.blogs(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.tombstone_deleted_blog_slugs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  locked_slug text;
  was_public boolean;
BEGIN
  was_public := OLD.status = 'published'
    OR OLD.published_at IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM public.blog_slug_redirects AS redirect
      WHERE redirect.blog_id = OLD.id
    );

  IF was_public AND OLD.slug IS NOT NULL THEN
    locked_slug := OLD.slug;
    PERFORM pg_advisory_xact_lock(
      hashtextextended('splitcost:blog-public-slug:' || locked_slug, 0)
    );

    INSERT INTO public.blog_slug_redirects (old_slug, blog_id)
    VALUES (OLD.slug, OLD.id)
    ON CONFLICT (old_slug) DO NOTHING;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER tombstone_deleted_blog_slugs
BEFORE DELETE ON public.blogs
FOR EACH ROW
EXECUTE FUNCTION public.tombstone_deleted_blog_slugs();

-- Keep privileged/direct redirect writes inside the same ownership protocol.
-- Normal application code never writes this table directly.
CREATE OR REPLACE FUNCTION public.guard_blog_slug_redirect_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_blog_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('splitcost:blog-public-slug:' || NEW.old_slug, 0)
  );

  SELECT blog.id
  INTO current_blog_id
  FROM public.blogs AS blog
  WHERE blog.slug = NEW.old_slug
    AND blog.status = 'published';

  IF FOUND AND (NEW.blog_id IS NULL OR NEW.blog_id <> current_blog_id) THEN
    RAISE EXCEPTION 'Blog slug % is already a current published URL', NEW.old_slug
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_blog_slug_redirect_ownership
BEFORE INSERT OR UPDATE OF old_slug, blog_id ON public.blog_slug_redirects
FOR EACH ROW
EXECUTE FUNCTION public.guard_blog_slug_redirect_ownership();

-- The CMS writes through authenticated server routes using the service-role
-- client. Anonymous and ordinary authenticated Supabase clients retain only
-- the public read surface.
DROP POLICY IF EXISTS "Allow all access to blogs" ON public.blogs;
CREATE POLICY "Allow public published blog reads"
ON public.blogs
FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS "Allow all access to blog drafts" ON public.blog_drafts;

REVOKE INSERT, UPDATE, DELETE ON public.blogs FROM anon, authenticated;
REVOKE ALL ON public.blog_drafts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.blog_slug_redirects FROM anon, authenticated;

DROP POLICY IF EXISTS "Allow all access to blog categories" ON public.blog_categories;
CREATE POLICY "Allow public blog category reads"
ON public.blog_categories
FOR SELECT
USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.blog_categories FROM anon, authenticated;

-- Blog media is written only by the authenticated server routes. Public object
-- reads remain available for article rendering.
DROP POLICY IF EXISTS "Allow blog image uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow blog image updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow blog image deletes" ON storage.objects;
