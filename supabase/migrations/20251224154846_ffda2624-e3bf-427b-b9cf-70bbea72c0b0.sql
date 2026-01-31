CREATE TYPE auth_provider_enum AS ENUM (
  'email',
  'google',
  'apple',
  'github',
  'facebook'
);

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text UNIQUE,
  phone text,
  avatar_url text,
  auth_provider auth_provider_enum,
  is_email_verified boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  currency text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text,
  nickname text,
  joined_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TYPE split_type_enum AS ENUM (
  'custom',
  'equal',
  'percentage'
);

CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL,
  paid_by_user_id uuid NOT NULL,
  split_type split_type_enum NOT NULL,
  category text NOT NULL,
  subcategory text NOT NULL,
  date date NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE,
  CONSTRAINT expenses_paid_by_user_id_fkey FOREIGN KEY (paid_by_user_id) REFERENCES public.users(id),
  CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.expense_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL,
  user_id uuid NOT NULL,
  share_amount numeric,
  share_percent numeric,
  CONSTRAINT expense_participants_pkey PRIMARY KEY (id),
  CONSTRAINT expense_participants_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE,
  CONSTRAINT expense_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

create or replace function add_expense(
  p_group_id uuid,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_paid_by_user_id uuid,
  p_split_type text,
  p_category text,
  p_subcategory text,
  p_date date,
  p_participants jsonb default '[]'
)
returns json
language plpgsql
as $$
declare
  v_expense expenses;
begin
  -- 1. Insert expense
  insert into expenses (
    group_id,
    description,
    amount,
    currency,
    paid_by_user_id,
    split_type,
    category,
    subcategory,
    date
  )
  values (
    p_group_id,
    p_description,
    p_amount,
    p_currency,
    p_paid_by_user_id,
    p_split_type::split_type_enum,
    p_category,
    p_subcategory,
    p_date
  )
  returning * into v_expense;

  -- 2. Insert participants (if any)
  if jsonb_array_length(p_participants) > 0 then
    insert into expense_participants (
      expense_id,
      user_id,
      share_amount,
      share_percent
    )
    select
      v_expense.id,
      (p->>'userId')::uuid,
      (p->>'amount')::numeric,
      nullif(p->>'percent','')::numeric
    from jsonb_array_elements(p_participants) as p;
  end if;

  -- 3. Return full response
  return json_build_object(
    'id', v_expense.id,
    'groupId', v_expense.group_id,
    'description', v_expense.description,
    'amount', v_expense.amount,
    'currency', v_expense.currency,
    'splitType', v_expense.split_type,
    'category', v_expense.category,
    'subcategory', v_expense.subcategory,
    'date', v_expense.date,
    'createdAt', v_expense.created_at,
    'paidBy', (
      select json_build_object('id', u.id, 'name', u.name)
      from users u
      where u.id = v_expense.paid_by_user_id
    ),
    'participants', (
      select coalesce(json_agg(ep), '[]'::json)
      from expense_participants ep
      where ep.expense_id = v_expense.id
    )
  );
end;
$$;


create or replace function create_group_with_members(
  group_name text,
  group_currency text,
  member_names text[]
)
returns json
language plpgsql
as $$
declare
  new_group_id uuid;
begin
  -- Create group
  insert into groups (name, currency)
  values (group_name, group_currency)
  returning id into new_group_id;

  -- Create users + members in one go
  with inserted_users as (
    insert into users (name)
    select unnest(member_names)
    returning id, name
  )
  insert into group_members (group_id, user_id, role)
  select new_group_id, id, 'member'
  from inserted_users;

  return json_build_object(
    'id', new_group_id,
    'name', group_name,
    'currency', group_currency,
    'members', (
      select json_agg(json_build_object(
        'id', u.id,
        'name', u.name
      ))
      from users u
      join group_members gm on gm.user_id = u.id
      where gm.group_id = new_group_id
    )
  );
end;
$$;

create or replace function edit_expense(
  p_group_id uuid,
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_paid_by_user_id uuid,
  p_split_type text,
  p_category text,
  p_subcategory text,
  p_date date,
  p_participants jsonb
)
returns table (
  id uuid,
  group_id uuid,
  description text,
  amount numeric,
  currency text,
  paid_by_user_id uuid,
  paid_by_name text,
  split_type text,
  category text,
  subcategory text,
  date date,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
as $$
begin
  -- 1. Update expense
  update expenses e
  set
    description = p_description,
    amount = p_amount,
    currency = p_currency,
    paid_by_user_id = p_paid_by_user_id,
    split_type = p_split_type::split_type_enum,
    category = p_category,
    subcategory = p_subcategory,
    date = p_date,
    updated_at = now()
  where e.id = p_expense_id
    and e.group_id = p_group_id;

  if not found then
    raise exception 'Expense not found';
  end if;

  -- 2. Delete existing participants
  delete from expense_participants ep
  where ep.expense_id = p_expense_id;

  -- 3. Insert updated participants
  if p_participants is not null then
    insert into expense_participants (
      expense_id,
      user_id,
      share_amount,
      share_percent
    )
    select
      p_expense_id,
      (item->>'userId')::uuid,
      (item->>'amount')::numeric,
      (item->>'percent')::numeric
    from jsonb_array_elements(p_participants) as item;
  end if;

  -- 4. Return updated expense
  return query
  select
    e.id           as id,
    e.group_id     as group_id,
    e.description  as description,
    e.amount       as amount,
    e.currency     as currency,
    e.paid_by_user_id as paid_by_user_id,
    u.name         as paid_by_name,
    e.split_type::text      as split_type_enum,
    e.category     as category,
    e.subcategory  as subcategory,
    e.date         as date,
    e.created_at   as created_at,
    e.updated_at   as updated_at
  from expenses e
  join users u on u.id = e.paid_by_user_id
  where e.id = p_expense_id;

end;
$$;

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to groups"
ON public.groups
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access to expenses"
ON public.expenses
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access to users"
ON public.users
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access to expense participants"
ON public.expense_participants
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all access to group members"
ON public.group_members
FOR ALL
USING (true)
WITH CHECK (true);
