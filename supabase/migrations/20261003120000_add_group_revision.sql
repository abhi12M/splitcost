-- Optimistic concurrency for group edits, matching expenses.revision. The
-- group edit API calls bump_group_revision before its first write, so a save
-- that started from an older version is refused before it changes anything.
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 1;

-- Compare-and-swap: increments the revision only when it still equals
-- p_expected_revision (NULL skips the check), and returns the new value.
-- The API translates the two explicit errors below into 404 / 409.
CREATE OR REPLACE FUNCTION public.bump_group_revision(
  p_group_id uuid,
  p_expected_revision bigint DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_revision bigint;
BEGIN
  UPDATE public.groups g
  SET revision = g.revision + 1,
      updated_at = now()
  WHERE g.id = p_group_id
    AND (p_expected_revision IS NULL OR g.revision = p_expected_revision)
  RETURNING g.revision INTO v_revision;

  IF NOT FOUND THEN
    SELECT g2.revision INTO v_revision
    FROM public.groups g2
    WHERE g2.id = p_group_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'GROUP_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    RAISE EXCEPTION 'GROUP_VERSION_CONFLICT:%', v_revision USING ERRCODE = 'P0001';
  END IF;

  RETURN v_revision;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_group_revision(uuid, bigint) TO service_role;
