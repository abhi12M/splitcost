ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS attachment_data_url text;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('expense-attachments', 'expense-attachments', false, 5242880)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit;
