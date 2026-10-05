-- Realtime notifications are delivery hints only. The revision check below is
-- the authoritative protection against a delayed/missed WebSocket message.
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS origin_session_id text;

UPDATE public.expenses
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.expenses
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

-- Full old rows let filtered DELETE events (and the revision/origin columns on
-- UPDATE) reach the browser. Member changes are broadcast by the group API
-- instead, so group_members needs neither this nor a publication entry.
ALTER TABLE public.expenses REPLICA IDENTITY FULL;
ALTER TABLE public.groups REPLICA IDENTITY FULL;

-- Add only the narrow tables used by the browser. The guarded form makes the
-- migration safe for environments where a table was enabled manually already.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'groups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
  END IF;
END $$;

-- `expected_revision` implements compare-and-swap. The API translates the two
-- explicit errors below into 404 / 409 rather than treating them as 500s.
DROP FUNCTION IF EXISTS public.edit_expense(
  uuid, uuid, text, numeric, text, uuid, text, text, text, date, jsonb, jsonb, text
);

CREATE OR REPLACE FUNCTION public.edit_expense(
  p_group_id uuid,
  p_expense_id uuid,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_paid_by_user_id uuid DEFAULT NULL,
  p_split_type text DEFAULT 'equal',
  p_category text DEFAULT 'uncategorized',
  p_subcategory text DEFAULT 'general',
  p_date date DEFAULT current_date,
  p_participants jsonb DEFAULT '[]'::jsonb,
  p_payers jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_expected_revision bigint DEFAULT NULL,
  p_origin_session_id text DEFAULT NULL
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
      revision = e.revision + 1,
      origin_session_id = p_origin_session_id
  WHERE e.id = p_expense_id
    AND e.group_id = p_group_id
    AND e.revision = p_expected_revision;

  IF NOT FOUND THEN
    -- Bare "revision" here would be ambiguous against this function's own
    -- RETURNS TABLE column of the same name (the same issue fixed in
    -- set_expense_category) — qualify it with a table alias.
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

CREATE OR REPLACE FUNCTION public.delete_expense(
  p_expense_id uuid,
  p_origin_session_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Deliberately not version-gated: if an update commits first, the requested
  -- delete still commits second; if delete wins, an edit gets EXPENSE_DELETED.
  DELETE FROM public.expenses WHERE id = p_expense_id;
  RETURN FOUND;
END;
$$;

-- Widening the signature (2 args -> 3) would otherwise leave the old 2-arg
-- overload in place alongside the new one, which PostgREST's RPC call can
-- resolve ambiguously.
DROP FUNCTION IF EXISTS public.set_expense_attachment_path(uuid, text);

CREATE OR REPLACE FUNCTION public.set_expense_attachment_path(
  p_expense_id uuid,
  p_attachment_path text,
  p_origin_session_id text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.expenses
  SET attachment_data_url = p_attachment_path,
      updated_at = now(),
      revision = revision + 1,
      origin_session_id = p_origin_session_id
  WHERE id = p_expense_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_expense_category(
  p_expense_id uuid,
  p_category text,
  p_subcategory text,
  p_origin_session_id text DEFAULT NULL
)
RETURNS TABLE(id uuid, group_id uuid, category text, subcategory text, updated_at timestamptz, revision bigint)
LANGUAGE plpgsql AS $$
BEGIN
  -- Combining UPDATE ... RETURNING with RETURN QUERY here makes Postgres
  -- ambiguous "revision": this function's OUT parameters (from RETURNS
  -- TABLE) share names with the expenses columns, and RETURNING no longer
  -- distinguishes "the column" from "the OUT parameter" for a bare name on
  -- the SET clause's left side. Doing the UPDATE and the read separately
  -- (as edit_expense already does) sidesteps the collision.
  UPDATE public.expenses AS e
  SET category = p_category,
      subcategory = p_subcategory,
      updated_at = now(),
      revision = e.revision + 1,
      origin_session_id = p_origin_session_id
  WHERE e.id = p_expense_id;

  RETURN QUERY
  SELECT e.id, e.group_id, e.category, e.subcategory, e.updated_at, e.revision
  FROM public.expenses e
  WHERE e.id = p_expense_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.edit_expense(
  uuid, uuid, text, numeric, text, uuid, text, text, text, date, jsonb, jsonb, text, bigint, text
) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_expense(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_expense_attachment_path(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_expense_category(uuid, text, text, text) TO service_role;
