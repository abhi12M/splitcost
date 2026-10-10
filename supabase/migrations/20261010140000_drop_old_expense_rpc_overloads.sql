-- Drop the old add_expense overload (10 params, no payers/notes).
-- It was granted to anon/authenticated, allowing direct calls that
-- bypass API validation. The newer 12-param version (service_role only)
-- is the one the API uses.
DROP FUNCTION IF EXISTS public.add_expense(
  uuid, text, numeric, text, uuid, text, text, text, date, jsonb
);

-- Drop the old edit_expense overload (11 params, no payers/notes/revision).
-- Same issue: granted to anon/authenticated. The newer 15-param version
-- (service_role only) is the one the API uses.
DROP FUNCTION IF EXISTS public.edit_expense(
  uuid, uuid, text, numeric, text, uuid, text, text, text, date, jsonb
);
