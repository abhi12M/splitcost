CREATE INDEX IF NOT EXISTS idx_group_members_group_active
ON public.group_members (group_id, is_active);

CREATE INDEX IF NOT EXISTS idx_group_members_user
ON public.group_members (user_id);

CREATE INDEX IF NOT EXISTS idx_expenses_group_activity
ON public.expenses (group_id, date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_group_paid_by
ON public.expenses (group_id, paid_by_user_id);

CREATE INDEX IF NOT EXISTS idx_expense_participants_expense
ON public.expense_participants (expense_id);

CREATE INDEX IF NOT EXISTS idx_expense_participants_user
ON public.expense_participants (user_id);

CREATE INDEX IF NOT EXISTS idx_expense_payers_user
ON public.expense_payers (user_id);

CREATE OR REPLACE FUNCTION load_group_summaries(p_group_ids uuid[] DEFAULT NULL)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  WITH selected_groups AS (
    SELECT
      g.id,
      g.name,
      g.currency,
      g.created_at,
      g.updated_at
    FROM groups g
    WHERE p_group_ids IS NULL
      OR g.id = ANY(p_group_ids)
  ),
  member_stats AS (
    SELECT
      gm.group_id,
      json_agg(u.name ORDER BY u.name) AS members,
      count(*)::int AS member_count
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    JOIN selected_groups sg ON sg.id = gm.group_id
    WHERE COALESCE(gm.is_active, true) = true
    GROUP BY gm.group_id
  ),
  expense_stats AS (
    SELECT
      e.group_id,
      count(*)::int AS expense_count,
      COALESCE(sum(e.amount), 0) AS total_expenses,
      max(COALESCE(e.updated_at, e.created_at)) AS latest_expense_activity_at
    FROM expenses e
    JOIN selected_groups sg ON sg.id = e.group_id
    GROUP BY e.group_id
  )
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', sg.id,
        'name', sg.name,
        'currency', sg.currency,
        'createdAt', sg.created_at,
        'updatedAt', sg.updated_at,
        'members', COALESCE(ms.members, '[]'::json),
        'memberCount', COALESCE(ms.member_count, 0),
        'expenseCount', COALESCE(es.expense_count, 0),
        'totalExpenses', COALESCE(es.total_expenses, 0),
        'latestExpenseActivityAt', es.latest_expense_activity_at
      )
      ORDER BY COALESCE(es.latest_expense_activity_at, sg.updated_at, sg.created_at) DESC
    ),
    '[]'::json
  )
  FROM selected_groups sg
  LEFT JOIN member_stats ms ON ms.group_id = sg.id
  LEFT JOIN expense_stats es ON es.group_id = sg.id;
$$;
