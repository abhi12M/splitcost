-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  members TEXT[] NOT NULL DEFAULT '{}',
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  paid_by TEXT NOT NULL,
  participants TEXT[] NOT NULL DEFAULT '{}',
  splits JSONB NOT NULL DEFAULT '[]',
  split_type TEXT NOT NULL DEFAULT 'equal',
  category TEXT NOT NULL DEFAULT 'general',
  subcategory TEXT NOT NULL DEFAULT 'general',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create public access policies for groups (no auth required for now)
CREATE POLICY "Allow all access to groups"
ON public.groups
FOR ALL
USING (true)
WITH CHECK (true);

-- Create public access policies for expenses
CREATE POLICY "Allow all access to expenses"
ON public.expenses
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster expense lookups by group
CREATE INDEX idx_expenses_group_id ON public.expenses(group_id);