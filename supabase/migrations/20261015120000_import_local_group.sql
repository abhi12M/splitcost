-- Groups created offline reach the server as one import: the group, its
-- members and every expense (settlements included) in a single transaction,
-- so a dropped connection never leaves half a group behind.
--
-- The import is idempotent. The app resends the same snapshot when it can't
-- tell whether an earlier attempt landed (e.g. the response was lost), so
-- each import is recorded with a hash of its payload: the same id with the
-- same hash is a repeat and succeeds without writing anything; the same id
-- with a different hash is refused, without revealing the stored group.
-- `group_id` deliberately has no foreign key: the record must outlive a later
-- delete of the group, or a late retry would recreate it.
CREATE TABLE IF NOT EXISTS public.group_imports (
  group_id uuid PRIMARY KEY,
  payload_hash text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_imports FROM anon, authenticated;
GRANT SELECT, INSERT ON public.group_imports TO service_role;

-- Returns 'created' or 'already_imported'; raises IMPORT_CONFLICT when the id
-- is taken by different content. Any other failure (an id already used by
-- another row, a bad value) rolls back the whole import.
-- Timestamps come from the device but are never allowed in the future.
CREATE OR REPLACE FUNCTION public.import_local_group(
  p_group_id uuid,
  p_payload_hash text,
  p_name text,
  p_currency text,
  p_created_at timestamptz,
  p_members jsonb,
  p_expenses jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_hash text;
  v_expense jsonb;
  v_expense_id uuid;
  v_group_created_at timestamptz := LEAST(COALESCE(p_created_at, now()), now());
BEGIN
  -- Concurrent imports of the same id queue on this primary key, so only
  -- one of them can get past this point.
  INSERT INTO public.group_imports (group_id, payload_hash)
  VALUES (p_group_id, p_payload_hash)
  ON CONFLICT (group_id) DO NOTHING;

  IF NOT FOUND THEN
    SELECT gi.payload_hash INTO v_existing_hash
    FROM public.group_imports gi
    WHERE gi.group_id = p_group_id;

    IF v_existing_hash = p_payload_hash THEN
      RETURN 'already_imported';
    END IF;
    RAISE EXCEPTION 'IMPORT_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (SELECT 1 FROM public.groups g WHERE g.id = p_group_id) THEN
    RAISE EXCEPTION 'IMPORT_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.groups (id, name, currency, created_at, updated_at)
  VALUES (p_group_id, p_name, p_currency, v_group_created_at, now());

  INSERT INTO public.users (id, name, created_at)
  SELECT (m->>'id')::uuid, m->>'name', v_group_created_at
  FROM jsonb_array_elements(p_members) AS m;

  INSERT INTO public.group_members (group_id, user_id, role, joined_at, created_at)
  SELECT p_group_id, (m->>'id')::uuid, 'member', v_group_created_at, v_group_created_at
  FROM jsonb_array_elements(p_members) AS m;

  FOR v_expense IN SELECT e FROM jsonb_array_elements(p_expenses) AS e
  LOOP
    v_expense_id := (v_expense->>'id')::uuid;

    INSERT INTO public.expenses (
      id, group_id, description, notes, amount, currency, paid_by_user_id,
      split_type, category, subcategory, date, created_at, updated_at
    )
    VALUES (
      v_expense_id,
      p_group_id,
      v_expense->>'description',
      NULLIF(v_expense->>'notes', ''),
      (v_expense->>'amount')::numeric,
      p_currency,
      NULLIF(v_expense->>'paidByUserId', '')::uuid,
      (v_expense->>'splitType')::split_type_enum,
      v_expense->>'category',
      v_expense->>'subcategory',
      (v_expense->>'date')::date,
      LEAST(COALESCE((v_expense->>'createdAt')::timestamptz, now()), now()),
      LEAST(COALESCE((v_expense->>'updatedAt')::timestamptz, now()), now())
    );

    INSERT INTO public.expense_participants (expense_id, user_id, share_amount, share_percent)
    SELECT
      v_expense_id,
      (p->>'userId')::uuid,
      NULLIF(p->>'amount', '')::numeric,
      NULLIF(p->>'percent', '')::numeric
    FROM jsonb_array_elements(COALESCE(v_expense->'participants', '[]'::jsonb)) AS p;

    INSERT INTO public.expense_payers (expense_id, user_id, amount)
    SELECT
      v_expense_id,
      (p->>'userId')::uuid,
      (p->>'amount')::numeric
    FROM jsonb_array_elements(COALESCE(v_expense->'payers', '[]'::jsonb)) AS p;
  END LOOP;

  RETURN 'created';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.import_local_group(uuid, text, text, text, timestamptz, jsonb, jsonb)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_local_group(uuid, text, text, text, timestamptz, jsonb, jsonb)
  TO service_role;
