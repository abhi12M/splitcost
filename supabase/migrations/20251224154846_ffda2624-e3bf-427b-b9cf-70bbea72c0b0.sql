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




-- CREATE TABLE expense_participants (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
--   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

--   share_amount NUMERIC,
--   share_percent NUMERIC,

--   UNIQUE (expense_id, user_id)
-- );



-- create table users (
--   id uuid primary key default uuid_generate_v4(),
--   name text not null,
--   email text unique,
--   phone text,
--   avatar_url text,
--   auth_provider auth_provider,
--   is_email_verified boolean default false,
--   created_at timestamptz default now(),
--   updated_at timestamptz
-- );

-- create table groups (
--   id uuid primary key default uuid_generate_v4(),
--   name text not null,
--   currency text not null,
--   created_by uuid references users(id) on delete set null,
--   created_at timestamptz default now(),
--   updated_at timestamptz
-- );

-- create table expenses (
--   id uuid primary key default uuid_generate_v4(),
--   group_id uuid not null references groups(id) on delete cascade,

--   description text not null,
--   amount numeric(12,2) not null,
--   currency text not null,

--   paid_by_user_id uuid not null references users(id),
--   participant_user_ids uuid[] not null,

--   splits jsonb not null,

--   split_type split_type not null,

--   category text not null,
--   subcategory text not null,

--   expenseDate date not null,

--   created_by uuid not null references users(id),

--   created_at timestamptz default now(),
--   updated_at timestamptz
-- );

-- -- optional JSONB
-- -- CREATE INDEX idx_expenses_splits_gin ON public.expenses USING GIN (splits jsonb_path_ops);

-- create table group_members (
--   id uuid primary key default uuid_generate_v4(),

--   group_id uuid not null references groups(id) on delete cascade,
--   user_id uuid not null references users(id) on delete cascade,

--   role text, -- optional string (e.g. 'admin', 'member', 'owner', etc.)
--   nickname text,

--   joined_at timestamptz default now(),
--   is_active boolean default true,

--   created_at timestamptz default now(),

--   -- Prevent duplicate membership
--   unique (group_id, user_id)
-- );

-- -- group_members
-- CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
-- CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
-- CREATE UNIQUE INDEX idx_group_members_unique ON public.group_members(group_id, user_id);

-- -- expenses
-- CREATE INDEX idx_expenses_group_id ON public.expenses(group_id);