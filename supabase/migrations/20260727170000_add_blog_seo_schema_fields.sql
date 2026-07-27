ALTER TABLE public.blogs
ADD COLUMN IF NOT EXISTS no_index boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS schema_json jsonb;
