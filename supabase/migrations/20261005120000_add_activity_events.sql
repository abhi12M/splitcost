-- Group and expense activity: one row per successful change. The group feed
-- and an expense's history are two filters on the same rows.
--
-- `data` is a snapshot (names, amounts) as they were at the time, so entries
-- stay correct after later renames and deletes. `expense_id` has no foreign
-- key on purpose: entries must survive the expense being deleted. Actor
-- columns stay empty until the app has login.
CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  expense_id uuid,
  kind text NOT NULL CHECK (kind IN (
    'group_created',
    'group_renamed',
    'member_added',
    'member_renamed',
    'member_removed',
    'expense_added',
    'expense_updated',
    'expense_deleted',
    'settlement_added',
    'settlement_deleted'
  )),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name text,
  origin_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Group feed, newest first, paged by (created_at, id).
CREATE INDEX IF NOT EXISTS activity_events_group_feed_idx
  ON public.activity_events (group_id, created_at DESC, id DESC);

-- One expense's history.
CREATE INDEX IF NOT EXISTS activity_events_expense_idx
  ON public.activity_events (expense_id, created_at DESC)
  WHERE expense_id IS NOT NULL;

-- No policies: only the server (service role) reads and writes activity.
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.activity_events TO service_role;
