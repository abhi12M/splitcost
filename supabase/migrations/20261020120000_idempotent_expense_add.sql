-- Adding an expense is idempotent per request id.
--
-- A new expense can reach the server while its answer is lost (the
-- connection drops in between); the app then keeps the form filled and the
-- user taps Add again. Each add carries a random request id, and a retry of
-- the same unanswered add resends the same id. The server records which
-- expense each id created, so a repeat returns that expense instead of adding
-- it twice. Only the server can tell a repeat apart from someone else adding
-- an identical expense at the same time.
--
-- The record goes with its expense (and its group): if the expense was
-- deleted before a late retry, the retry adds it again, like any other add.
CREATE TABLE IF NOT EXISTS public.expense_add_requests (
  request_id uuid PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_add_requests_expense_id_idx
  ON public.expense_add_requests (expense_id);

ALTER TABLE public.expense_add_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.expense_add_requests FROM anon, authenticated;
GRANT SELECT, INSERT ON public.expense_add_requests TO service_role;

-- The new parameter makes a new signature; drop the old one so it can't be
-- called without it.
DROP FUNCTION IF EXISTS public.add_expense(uuid, text, numeric, text, uuid, text, text, text, date, jsonb, jsonb, text);

-- Returns the expense, with "alreadyAdded": true when p_request_id was seen
-- before (nothing is written then). Raises ADD_REQUEST_CONFLICT when the id
-- belongs to another group, without revealing that group's expense.
CREATE OR REPLACE FUNCTION public.add_expense(
  p_group_id uuid,
  p_description text,
  p_amount numeric,
  p_currency text,
  p_paid_by_user_id uuid DEFAULT NULL,
  p_split_type text DEFAULT 'equal',
  p_category text DEFAULT 'uncategorized',
  p_subcategory text DEFAULT 'general',
  p_date date DEFAULT CURRENT_DATE,
  p_participants jsonb DEFAULT '[]'::jsonb,
  p_payers jsonb DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_request_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_expense expenses;
  v_request_group uuid;
  v_request_expense uuid;
  v_already_added boolean := false;
BEGIN
  IF p_request_id IS NOT NULL THEN
    -- Two tries of the same add arriving together (a double tap, or a retry
    -- while the first is still running) queue here, so the second one sees
    -- what the first wrote.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));

    SELECT r.group_id, r.expense_id INTO v_request_group, v_request_expense
    FROM public.expense_add_requests r
    WHERE r.request_id = p_request_id;

    IF FOUND THEN
      IF v_request_group IS DISTINCT FROM p_group_id THEN
        RAISE EXCEPTION 'ADD_REQUEST_CONFLICT' USING ERRCODE = 'P0001';
      END IF;
      SELECT * INTO v_expense FROM public.expenses e WHERE e.id = v_request_expense;
      v_already_added := true;
    END IF;
  END IF;

  IF NOT v_already_added THEN
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

    IF p_request_id IS NOT NULL THEN
      INSERT INTO public.expense_add_requests (request_id, group_id, expense_id)
      VALUES (p_request_id, p_group_id, v_expense.id);
    END IF;
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
    'alreadyAdded', v_already_added,
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

REVOKE ALL ON FUNCTION public.add_expense(uuid, text, numeric, text, uuid, text, text, text, date, jsonb, jsonb, text, uuid) FROM public, anon, authenticated;
GRANT ALL ON FUNCTION public.add_expense(uuid, text, numeric, text, uuid, text, text, text, date, jsonb, jsonb, text, uuid) TO service_role;
