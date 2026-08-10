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
