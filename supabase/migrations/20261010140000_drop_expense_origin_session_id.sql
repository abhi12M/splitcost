-- origin_session_id on expenses was used by postgres_changes realtime so each
-- tab could ignore its own row updates.  After switching to broadcast the
-- session id travels in the broadcast payload, so the column is dead weight.
-- activity_events.origin_session_id is kept — the activity feed still uses it.

ALTER TABLE public.expenses DROP COLUMN IF EXISTS origin_session_id;

-- Recreate functions without the p_origin_session_id parameter.
-- Each DROP removes the old signature so PostgREST doesn't see two overloads.

-- edit_expense ----------------------------------------------------------------
DROP FUNCTION IF EXISTS public.edit_expense(
  uuid, uuid, text, numeric, text, uuid, text, text, text, date, jsonb, jsonb, text, bigint, text
);

CREATE OR REPLACE FUNCTION public.edit_expense(
  p_group_id uuid,
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_paid_by_user_id uuid DEFAULT NULL,
  p_split_type text DEFAULT 'equal',
  p_category text DEFAULT 'general',
  p_subcategory text DEFAULT 'general',
  p_date date DEFAULT current_date,
  p_participants jsonb DEFAULT '[]'::jsonb,
  p_payers jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_expected_revision bigint DEFAULT NULL
)
RETURNS TABLE(
  id uuid, group_id uuid, description text, notes text, amount numeric,
  currency text, paid_by_user_id uuid, paid_by_name text, split_type text,
  category text, subcategory text, date date, created_at timestamptz,
  updated_at timestamptz, revision bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_revision bigint;
BEGIN
  UPDATE public.expenses AS e
  SET description = p_description,
      notes = p_notes,
      amount = p_amount,
      currency = p_currency,
      paid_by_user_id = p_paid_by_user_id,
      split_type = p_split_type::public.split_type_enum,
      category = p_category,
      subcategory = p_subcategory,
      date = p_date,
      updated_at = now(),
      revision = e.revision + 1
  WHERE e.id = p_expense_id
    AND e.group_id = p_group_id
    AND e.revision = p_expected_revision;

  IF NOT FOUND THEN
    SELECT e2.revision INTO v_current_revision
    FROM public.expenses e2
    WHERE e2.id = p_expense_id AND e2.group_id = p_group_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'EXPENSE_DELETED' USING ERRCODE = 'P0001';
    END IF;

    RAISE EXCEPTION 'EXPENSE_VERSION_CONFLICT:%', v_current_revision USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.expense_participants WHERE expense_id = p_expense_id;
  IF p_participants IS NOT NULL THEN
    INSERT INTO public.expense_participants (expense_id, user_id, share_amount, share_percent)
    SELECT p_expense_id, (item->>'userId')::uuid, (item->>'amount')::numeric,
      NULLIF(item->>'percent', '')::numeric
    FROM jsonb_array_elements(p_participants) AS item;
  END IF;

  DELETE FROM public.expense_payers WHERE expense_id = p_expense_id;
  IF p_payers IS NOT NULL AND jsonb_array_length(p_payers) > 0 THEN
    INSERT INTO public.expense_payers (expense_id, user_id, amount)
    SELECT p_expense_id, (item->>'userId')::uuid, (item->>'amount')::numeric
    FROM jsonb_array_elements(p_payers) AS item;
  END IF;

  RETURN QUERY
  SELECT e.id, e.group_id, e.description, e.notes, e.amount, e.currency,
    e.paid_by_user_id, u.name, e.split_type::text, e.category, e.subcategory,
    e.date, e.created_at, e.updated_at, e.revision
  FROM public.expenses e
  LEFT JOIN public.users u ON u.id = e.paid_by_user_id
  WHERE e.id = p_expense_id;
END;
$$;

-- delete_expense --------------------------------------------------------------
DROP FUNCTION IF EXISTS public.delete_expense(uuid, text);

CREATE OR REPLACE FUNCTION public.delete_expense(
  p_expense_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.expenses WHERE id = p_expense_id;
  RETURN FOUND;
END;
$$;

-- set_expense_attachment_path -------------------------------------------------
DROP FUNCTION IF EXISTS public.set_expense_attachment_path(uuid, text, text);

CREATE OR REPLACE FUNCTION public.set_expense_attachment_path(
  p_expense_id uuid,
  p_attachment_path text
)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.expenses
  SET attachment_data_url = p_attachment_path,
      updated_at = now(),
      revision = revision + 1
  WHERE id = p_expense_id;
  RETURN FOUND;
END;
$$;

-- set_expense_category --------------------------------------------------------
DROP FUNCTION IF EXISTS public.set_expense_category(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.set_expense_category(
  p_expense_id uuid,
  p_category text,
  p_subcategory text
)
RETURNS TABLE(id uuid, group_id uuid, category text, subcategory text, updated_at timestamptz, revision bigint)
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.expenses AS e
  SET category = p_category,
      subcategory = p_subcategory,
      updated_at = now(),
      revision = e.revision + 1
  WHERE e.id = p_expense_id;

  RETURN QUERY
  SELECT e.id, e.group_id, e.category, e.subcategory, e.updated_at, e.revision
  FROM public.expenses e
  WHERE e.id = p_expense_id;
END;
$$;

-- Grants (new signatures) ----------------------------------------------------
GRANT EXECUTE ON FUNCTION public.edit_expense(
  uuid, uuid, text, numeric, text, uuid, text, text, text, date, jsonb, jsonb, text, bigint
) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_expense(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_expense_attachment_path(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_expense_category(uuid, text, text) TO service_role;

-- Revoke from public/anon/authenticated (lockdown already did this for the old
-- signatures; these cover the new ones).
REVOKE ALL ON FUNCTION public.edit_expense(
  uuid, uuid, text, numeric, text, uuid, text, text, text, date, jsonb, jsonb, text, bigint
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_expense(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_expense_attachment_path(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_expense_category(uuid, text, text) FROM PUBLIC, anon, authenticated;
