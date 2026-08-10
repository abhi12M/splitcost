ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_notes_length;

ALTER TABLE public.expenses
ADD CONSTRAINT expenses_notes_length
CHECK (notes IS NULL OR char_length(notes) <= 10000);

DROP FUNCTION IF EXISTS add_expense(
  uuid, text, numeric, text, uuid, text, text, text, date, jsonb, jsonb
);

DROP FUNCTION IF EXISTS edit_expense(
  uuid, uuid, text, numeric, text, uuid, text, text, text, date, jsonb, jsonb
);

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
  p_payers jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_expense expenses;
BEGIN
  INSERT INTO expenses (
    group_id, description, notes, amount, currency,
    paid_by_user_id, split_type, category, subcategory, date
  )
  VALUES (
    p_group_id, p_description, p_notes, p_amount, p_currency,
    p_paid_by_user_id, p_split_type::split_type_enum,
    p_category, p_subcategory, p_date
  )
  RETURNING * INTO v_expense;

  IF jsonb_array_length(p_participants) > 0 THEN
    INSERT INTO expense_participants (expense_id, user_id, share_amount, share_percent)
    SELECT
      v_expense.id,
      (p->>'userId')::uuid,
      (p->>'amount')::numeric,
      nullif(p->>'percent','')::numeric
    FROM jsonb_array_elements(p_participants) AS p;
  END IF;

  IF p_payers IS NOT NULL AND jsonb_array_length(p_payers) > 0 THEN
    INSERT INTO expense_payers (expense_id, user_id, amount)
    SELECT
      v_expense.id,
      (p->>'userId')::uuid,
      (p->>'amount')::numeric
    FROM jsonb_array_elements(p_payers) AS p;
  END IF;

  RETURN json_build_object(
    'id', v_expense.id,
    'groupId', v_expense.group_id,
    'description', v_expense.description,
    'notes', v_expense.notes,
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
  p_payers jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  group_id uuid,
  description text,
  notes text,
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
  UPDATE expenses e
  SET
    description = p_description,
    notes = p_notes,
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

  DELETE FROM expense_participants ep
  WHERE ep.expense_id = p_expense_id;

  IF p_participants IS NOT NULL THEN
    INSERT INTO expense_participants (expense_id, user_id, share_amount, share_percent)
    SELECT
      p_expense_id,
      (item->>'userId')::uuid,
      (item->>'amount')::numeric,
      (item->>'percent')::numeric
    FROM jsonb_array_elements(p_participants) AS item;
  END IF;

  DELETE FROM expense_payers ep
  WHERE ep.expense_id = p_expense_id;

  IF p_payers IS NOT NULL AND jsonb_array_length(p_payers) > 0 THEN
    INSERT INTO expense_payers (expense_id, user_id, amount)
    SELECT
      p_expense_id,
      (item->>'userId')::uuid,
      (item->>'amount')::numeric
    FROM jsonb_array_elements(p_payers) AS item;
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.group_id,
    e.description,
    e.notes,
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
