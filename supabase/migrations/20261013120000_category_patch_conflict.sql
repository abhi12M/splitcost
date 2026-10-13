-- The quick category pick on the expense view used to overwrite whatever was
-- stored. It now carries the category the user saw; if someone else changed
-- it since (to something other than what this user picked), the update is
-- rejected so the UI can ask which one to keep. A deleted expense raises
-- EXPENSE_DELETED instead of silently returning no row.

DROP FUNCTION IF EXISTS public.set_expense_category(uuid, text, text);

CREATE OR REPLACE FUNCTION public.set_expense_category(
  p_expense_id uuid,
  p_category text,
  p_subcategory text,
  p_expected_category text,
  p_expected_subcategory text
)
RETURNS TABLE(id uuid, group_id uuid, category text, subcategory text, updated_at timestamptz, revision bigint)
LANGUAGE plpgsql AS $$
DECLARE
  v_category text;
  v_subcategory text;
BEGIN
  SELECT e.category, e.subcategory INTO v_category, v_subcategory
  FROM public.expenses e
  WHERE e.id = p_expense_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EXPENSE_DELETED' USING ERRCODE = 'P0001';
  END IF;

  -- Already what the user picked: nothing to change, nothing to conflict with.
  IF v_category = p_category AND v_subcategory = p_subcategory THEN
    RETURN QUERY
    SELECT e.id, e.group_id, e.category, e.subcategory, e.updated_at, e.revision
    FROM public.expenses e
    WHERE e.id = p_expense_id;
    RETURN;
  END IF;

  IF v_category IS DISTINCT FROM p_expected_category
     OR v_subcategory IS DISTINCT FROM p_expected_subcategory THEN
    RAISE EXCEPTION 'EXPENSE_CATEGORY_CONFLICT' USING ERRCODE = 'P0001';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.set_expense_category(uuid, text, text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.set_expense_category(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
