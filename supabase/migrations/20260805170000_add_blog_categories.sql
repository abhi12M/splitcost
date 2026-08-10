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
