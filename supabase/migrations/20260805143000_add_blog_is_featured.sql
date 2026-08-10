ALTER TABLE public.blogs
ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.blog_drafts
ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX blogs_featured_status_published_at_idx
ON public.blogs (is_featured DESC, status, published_at DESC);
