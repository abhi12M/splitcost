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

-- create or replace function add_expense(
--   p_group_id uuid,
--   p_description text,
--   p_amount numeric,
--   p_currency text,
--   p_paid_by_user_id uuid,
--   p_split_type text,
--   p_category text,
--   p_subcategory text,
--   p_date date,
--   p_participants jsonb default '[]'
-- )
-- returns json
-- language plpgsql
-- as $$
-- declare
--   v_expense expenses;
-- begin
--   -- 1. Insert expense
--   insert into expenses (
--     group_id,
--     description,
--     amount,
--     currency,
--     paid_by_user_id,
--     split_type,
--     category,
--     subcategory,
--     date
--   )
--   values (
--     p_group_id,
--     p_description,
--     p_amount,
--     p_currency,
--     p_paid_by_user_id,
--     p_split_type::split_type,
--     p_category,
--     p_subcategory,
--     p_date
--   )
--   returning * into v_expense;

--   -- 2. Insert participants (if any)
--   if jsonb_array_length(p_participants) > 0 then
--     insert into expense_participants (
--       expense_id,
--       user_id,
--       share_amount,
--       share_percent
--     )
--     select
--       v_expense.id,
--       (p->>'userId')::uuid,
--       (p->>'amount')::numeric,
--       nullif(p->>'percent','')::numeric
--     from jsonb_array_elements(p_participants) as p;
--   end if;

--   -- 3. Return full response
--   return json_build_object(
--     'id', v_expense.id,
--     'groupId', v_expense.group_id,
--     'description', v_expense.description,
--     'amount', v_expense.amount,
--     'currency', v_expense.currency,
--     'splitType', v_expense.split_type,
--     'category', v_expense.category,
--     'subcategory', v_expense.subcategory,
--     'date', v_expense.date,
--     'createdAt', v_expense.created_at,
--     'paidBy', (
--       select json_build_object('id', u.id, 'name', u.name)
--       from users u
--       where u.id = v_expense.paid_by_user_id
--     ),
--     'participants', (
--       select coalesce(json_agg(ep), '[]'::json)
--       from expense_participants ep
--       where ep.expense_id = v_expense.id
--     )
--   );
-- end;
-- $$;


-- create or replace function create_group_with_members(
--   group_name text,
--   group_currency text,
--   member_names text[]
-- )
-- returns json
-- language plpgsql
-- as $$
-- declare
--   new_group_id uuid;
-- begin
--   -- Create group
--   insert into groups (name, currency)
--   values (group_name, group_currency)
--   returning id into new_group_id;

--   -- Create users + members in one go
--   with inserted_users as (
--     insert into users (name)
--     select unnest(member_names)
--     returning id, name
--   )
--   insert into group_members (group_id, user_id, role)
--   select new_group_id, id, 'member'
--   from inserted_users;

--   return json_build_object(
--     'id', new_group_id,
--     'name', group_name,
--     'currency', group_currency,
--     'members', (
--       select json_agg(json_build_object(
--         'id', u.id,
--         'name', u.name
--       ))
--       from users u
--       join group_members gm on gm.user_id = u.id
--       where gm.group_id = new_group_id
--     )
--   );
-- end;
-- $$;
