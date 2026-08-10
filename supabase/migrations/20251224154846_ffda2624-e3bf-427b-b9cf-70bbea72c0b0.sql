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
