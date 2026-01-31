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

-- create or replace function edit_expense(
--   p_group_id uuid,
--   p_expense_id uuid,
--   p_description text,
--   p_amount numeric,
--   p_currency text,
--   p_paid_by_user_id uuid,
--   p_split_type text,
--   p_category text,
--   p_subcategory text,
--   p_date date,
--   p_participants jsonb
-- )
-- returns table (
--   id uuid,
--   group_id uuid,
--   description text,
--   amount numeric,
--   currency text,
--   paid_by_user_id uuid,
--   paid_by_name text,
--   split_type text,
--   category text,
--   subcategory text,
--   date date,
--   created_at timestamptz,
--   updated_at timestamptz
-- )
-- language plpgsql
-- as $$
-- begin
--   -- 1. Update expense
--   update expenses e
--   set
--     description = p_description,
--     amount = p_amount,
--     currency = p_currency,
--     paid_by_user_id = p_paid_by_user_id,
--     split_type = p_split_type::split_type,
--     category = p_category,
--     subcategory = p_subcategory,
--     date = p_date,
--     updated_at = now()
--   where e.id = p_expense_id
--     and e.group_id = p_group_id;

--   if not found then
--     raise exception 'Expense not found';
--   end if;

--   -- 2. Delete existing participants
--   delete from expense_participants ep
--   where ep.expense_id = p_expense_id;

--   -- 3. Insert updated participants
--   if p_participants is not null then
--     insert into expense_participants (
--       expense_id,
--       user_id,
--       share_amount,
--       share_percent
--     )
--     select
--       p_expense_id,
--       (item->>'userId')::uuid,
--       (item->>'amount')::numeric,
--       (item->>'percent')::numeric
--     from jsonb_array_elements(p_participants) as item;
--   end if;

--   -- 4. Return updated expense
--   return query
--   select
--     e.id           as id,
--     e.group_id     as group_id,
--     e.description  as description,
--     e.amount       as amount,
--     e.currency     as currency,
--     e.paid_by_user_id as paid_by_user_id,
--     u.name         as paid_by_name,
--     e.split_type::text      as split_type,
--     e.category     as category,
--     e.subcategory  as subcategory,
--     e.date         as date,
--     e.created_at   as created_at,
--     e.updated_at   as updated_at
--   from expenses e
--   join users u on u.id = e.paid_by_user_id
--   where e.id = p_expense_id;

-- end;
-- $$;

