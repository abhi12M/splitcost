-- Receipt (attachment) changes used to go through set_expense_attachment_path,
-- which bumped the expense revision on every add, replace and remove. Anyone
-- editing the expense's details at the time was then told the expense had
-- "changed" and had their save refused, although none of their fields clashed
-- with a receipt. That function also reported success for an expense that no
-- longer existed, and let two simultaneous uploads each remove only the file
-- they had read earlier, leaving the other's file orphaned in storage.
--
-- Replaced by two functions that lock the expense row, so concurrent receipt
-- changes line up one after another and each learns which receipt it actually
-- replaced. Neither touches `revision`: that stays the version of the
-- expense's details, so only real edits can conflict.

DROP FUNCTION IF EXISTS public.set_expense_attachment_path(uuid, text);

-- Points the expense at a newly uploaded receipt and returns the one it
-- replaced (null when there was none). Raises EXPENSE_DELETED when the
-- expense is gone, so the caller can discard the file it just uploaded.
CREATE OR REPLACE FUNCTION public.replace_expense_attachment(
  p_expense_id uuid,
  p_attachment_path text
)
RETURNS TABLE(previous_path text)
LANGUAGE plpgsql AS $$
DECLARE
  v_previous text;
BEGIN
  SELECT e.attachment_data_url INTO v_previous
  FROM public.expenses e
  WHERE e.id = p_expense_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EXPENSE_DELETED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.expenses AS e
  SET attachment_data_url = p_attachment_path,
      updated_at = now()
  WHERE e.id = p_expense_id;

  RETURN QUERY SELECT v_previous;
END;
$$;

-- Removes the expense's receipt and returns the one it removed (null when
-- there was none). When p_expected_path is given, only that receipt is
-- removed: if a different one is stored now, someone replaced it after the
-- caller looked, and ATTACHMENT_CHANGED is raised instead of destroying it.
-- An expense that no longer exists returns no row: there is nothing left to
-- remove, which is what the caller wanted.
CREATE OR REPLACE FUNCTION public.clear_expense_attachment(
  p_expense_id uuid,
  p_expected_path text DEFAULT NULL
)
RETURNS TABLE(previous_path text)
LANGUAGE plpgsql AS $$
DECLARE
  v_previous text;
BEGIN
  SELECT e.attachment_data_url INTO v_previous
  FROM public.expenses e
  WHERE e.id = p_expense_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_previous IS NULL THEN
    RETURN QUERY SELECT NULL::text;
    RETURN;
  END IF;

  IF p_expected_path IS NOT NULL AND v_previous IS DISTINCT FROM p_expected_path THEN
    RAISE EXCEPTION 'ATTACHMENT_CHANGED' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.expenses AS e
  SET attachment_data_url = NULL,
      updated_at = now()
  WHERE e.id = p_expense_id;

  RETURN QUERY SELECT v_previous;
END;
$$;

GRANT EXECUTE ON FUNCTION public.replace_expense_attachment(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_expense_attachment(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.replace_expense_attachment(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clear_expense_attachment(uuid, text) FROM PUBLIC, anon, authenticated;
