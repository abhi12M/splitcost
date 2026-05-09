ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS attachment_data_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('expense-attachments', 'expense-attachments', true, 5242880)
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
      AND policyname = 'Allow public read expense attachments'
  ) THEN
    CREATE POLICY "Allow public read expense attachments"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'expense-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public write expense attachments'
  ) THEN
    CREATE POLICY "Allow public write expense attachments"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'expense-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public update expense attachments'
  ) THEN
    CREATE POLICY "Allow public update expense attachments"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'expense-attachments')
    WITH CHECK (bucket_id = 'expense-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow public delete expense attachments'
  ) THEN
    CREATE POLICY "Allow public delete expense attachments"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'expense-attachments');
  END IF;
END $$;
