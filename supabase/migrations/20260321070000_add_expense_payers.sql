-- Migration: Add expense_payers table for multiple payers support
-- Run this migration in your Supabase dashboard or via CLI

-- 1. Create expense_payers table (mirrors expense_participants pattern)
CREATE TABLE public.expense_payers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  CONSTRAINT expense_payers_pkey PRIMARY KEY (id),
  CONSTRAINT expense_payers_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE,
  CONSTRAINT expense_payers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT expense_payers_unique UNIQUE (expense_id, user_id)
);

-- 2. Make paid_by_user_id nullable (null when multiple payers)
ALTER TABLE public.expenses ALTER COLUMN paid_by_user_id DROP NOT NULL;

-- 3. Enable RLS on new table
ALTER TABLE public.expense_payers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to expense_payers"
ON public.expense_payers
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Update add_expense RPC to accept payers
CREATE OR REPLACE FUNCTION add_expense(
  p_group_id uuid,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_paid_by_user_id uuid DEFAULT NULL,
  p_split_type text DEFAULT 'equal',
  p_category text DEFAULT 'uncategorized',
  p_subcategory text DEFAULT 'general',
  p_date date DEFAULT CURRENT_DATE,
  p_participants jsonb DEFAULT '[]',
  p_payers jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_expense expenses;
BEGIN
  -- 1. Insert expense
  INSERT INTO expenses (
    group_id, description, amount, currency,
    paid_by_user_id, split_type, category, subcategory, date
  )
  VALUES (
    p_group_id, p_description, p_amount, p_currency,
    p_paid_by_user_id, p_split_type::split_type_enum,
    p_category, p_subcategory, p_date
  )
  RETURNING * INTO v_expense;

  -- 2. Insert participants (if any)
  IF jsonb_array_length(p_participants) > 0 THEN
    INSERT INTO expense_participants (expense_id, user_id, share_amount, share_percent)
    SELECT
      v_expense.id,
      (p->>'userId')::uuid,
      (p->>'amount')::numeric,
      nullif(p->>'percent','')::numeric
    FROM jsonb_array_elements(p_participants) AS p;
  END IF;

  -- 3. Insert payers (if multiple payers)
  IF p_payers IS NOT NULL AND jsonb_array_length(p_payers) > 0 THEN
    INSERT INTO expense_payers (expense_id, user_id, amount)
    SELECT
      v_expense.id,
      (p->>'userId')::uuid,
      (p->>'amount')::numeric
    FROM jsonb_array_elements(p_payers) AS p;
  END IF;

  -- 4. Return full response
  RETURN json_build_object(
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
      SELECT json_build_object('id', u.id, 'name', u.name)
      FROM users u
      WHERE u.id = v_expense.paid_by_user_id
    ),
    'payers', (
      SELECT COALESCE(json_agg(json_build_object(
        'user', json_build_object('id', u.id, 'name', u.name),
        'amount', ep.amount
      )), '[]'::json)
      FROM expense_payers ep
      JOIN users u ON u.id = ep.user_id
      WHERE ep.expense_id = v_expense.id
    ),
    'participants', (
      SELECT coalesce(json_agg(ep), '[]'::json)
      FROM expense_participants ep
      WHERE ep.expense_id = v_expense.id
    )
  );
END;
$$;

-- 5. Update edit_expense RPC to accept payers
CREATE OR REPLACE FUNCTION edit_expense(
  p_group_id uuid,
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_paid_by_user_id uuid DEFAULT NULL,
  p_split_type text DEFAULT 'equal',
  p_category text DEFAULT 'uncategorized',
  p_subcategory text DEFAULT 'general',
  p_date date DEFAULT CURRENT_DATE,
  p_participants jsonb DEFAULT '[]',
  p_payers jsonb DEFAULT NULL
)
RETURNS TABLE (
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
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Update expense
  UPDATE expenses e
  SET
    description = p_description,
    amount = p_amount,
    currency = p_currency,
    paid_by_user_id = p_paid_by_user_id,
    split_type = p_split_type::split_type_enum,
    category = p_category,
    subcategory = p_subcategory,
    date = p_date,
    updated_at = now()
  WHERE e.id = p_expense_id
    AND e.group_id = p_group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  -- 2. Delete existing participants
  DELETE FROM expense_participants ep
  WHERE ep.expense_id = p_expense_id;

  -- 3. Insert updated participants
  IF p_participants IS NOT NULL THEN
    INSERT INTO expense_participants (expense_id, user_id, share_amount, share_percent)
    SELECT
      p_expense_id,
      (item->>'userId')::uuid,
      (item->>'amount')::numeric,
      (item->>'percent')::numeric
    FROM jsonb_array_elements(p_participants) AS item;
  END IF;

  -- 4. Delete existing payers
  DELETE FROM expense_payers ep
  WHERE ep.expense_id = p_expense_id;

  -- 5. Insert updated payers (if multiple payers)
  IF p_payers IS NOT NULL AND jsonb_array_length(p_payers) > 0 THEN
    INSERT INTO expense_payers (expense_id, user_id, amount)
    SELECT
      p_expense_id,
      (item->>'userId')::uuid,
      (item->>'amount')::numeric
    FROM jsonb_array_elements(p_payers) AS item;
  END IF;

  -- 6. Return updated expense
  RETURN QUERY
  SELECT
    e.id,
    e.group_id,
    e.description,
    e.amount,
    e.currency,
    e.paid_by_user_id,
    u.name AS paid_by_name,
    e.split_type::text,
    e.category,
    e.subcategory,
    e.date,
    e.created_at,
    e.updated_at
  FROM expenses e
  LEFT JOIN users u ON u.id = e.paid_by_user_id
  WHERE e.id = p_expense_id;
END;
$$;


CREATE OR REPLACE FUNCTION load_group_details(group_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_group groups;
BEGIN
  SELECT *
  INTO v_group
  FROM groups
  WHERE id = group_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'group', json_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'currency', v_group.currency,
      'members', (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name
            )
            ORDER BY u.name
          ),
          '[]'::json
        )
        FROM group_members gm
        JOIN users u ON u.id = gm.user_id
        WHERE gm.group_id = v_group.id
          AND COALESCE(gm.is_active, true) = true
      )
    ),
    'expenses', (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'id', e.id,
            'groupId', e.group_id,
            'amount', e.amount,
            'description', e.description,
            'currency', e.currency,
            'paidBy', CASE
              WHEN payer_user.id IS NULL THEN NULL
              ELSE json_build_object(
                'id', payer_user.id,
                'name', payer_user.name
              )
            END,
            'payers', (
              SELECT COALESCE(
                json_agg(
                  json_build_object(
                    'user', json_build_object(
                      'id', payer_member.id,
                      'name', payer_member.name
                    ),
                    'amount', epy.amount
                  )
                  ORDER BY payer_member.name
                ),
                '[]'::json
              )
              FROM expense_payers epy
              JOIN users payer_member ON payer_member.id = epy.user_id
              WHERE epy.expense_id = e.id
            ),
            'splitType', e.split_type,
            'category', e.category,
            'subcategory', e.subcategory,
            'date', e.date,
            'participants', (
              SELECT COALESCE(
                json_agg(
                  json_build_object(
                    'user', json_build_object(
                      'id', participant_user.id,
                      'name', participant_user.name
                    ),
                    'amount', ep.share_amount,
                    'percent', ep.share_percent
                  )
                  ORDER BY participant_user.name
                ),
                '[]'::json
              )
              FROM expense_participants ep
              JOIN users participant_user ON participant_user.id = ep.user_id
              WHERE ep.expense_id = e.id
            ),
            'createdAt', e.created_at,
            'updatedAt', e.updated_at
          )
          ORDER BY e.date DESC, e.created_at DESC
        ),
        '[]'::json
      )
      FROM expenses e
      LEFT JOIN users payer_user ON payer_user.id = e.paid_by_user_id
      WHERE e.group_id = v_group.id
    )
  );
END;
$$;
