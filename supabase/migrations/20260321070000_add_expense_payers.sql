-- Migration: Add expense_payers table for multiple payers support
-- Run this migration in your Supabase dashboard or via CLI

-- 1. Create expense_payers table (mirrors expense_participants pattern)
CREATE TABLE public.expense_payers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  CONSTRAINT expense_payers_pkey PRIMARY KEY (id),
  CONSTRAINT expense_payers_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE,
  CONSTRAINT expense_payers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT expense_payers_unique UNIQUE (expense_id, user_id)
);

-- 2. Make paid_by_user_id nullable (null when multiple payers)
ALTER TABLE public.expenses ALTER COLUMN paid_by_user_id DROP NOT NULL;

-- 3. Enable RLS on new table
ALTER TABLE public.expense_payers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to expense_payers"
ON public.expense_payers
FOR ALL
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION load_group_details(group_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_group groups;
BEGIN
  SELECT *
  INTO v_group
  FROM groups
  WHERE id = group_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'group', json_build_object(
      'id', v_group.id,
      'name', v_group.name,
      'currency', v_group.currency,
      'members', (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name
            )
            ORDER BY u.name
          ),
          '[]'::json
        )
        FROM group_members gm
        JOIN users u ON u.id = gm.user_id
        WHERE gm.group_id = v_group.id
          AND COALESCE(gm.is_active, true) = true
      )
    ),
    'expenses', (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'id', e.id,
            'groupId', e.group_id,
            'amount', e.amount,
            'description', e.description,
            'currency', e.currency,
            'paidBy', CASE
              WHEN payer_user.id IS NULL THEN NULL
              ELSE json_build_object(
                'id', payer_user.id,
                'name', payer_user.name
              )
            END,
            'payers', (
              SELECT COALESCE(
                json_agg(
                  json_build_object(
                    'user', json_build_object(
                      'id', payer_member.id,
                      'name', payer_member.name
                    ),
                    'amount', epy.amount
                  )
                  ORDER BY payer_member.name
                ),
                '[]'::json
              )
              FROM expense_payers epy
              JOIN users payer_member ON payer_member.id = epy.user_id
              WHERE epy.expense_id = e.id
            ),
            'splitType', e.split_type,
            'category', e.category,
            'subcategory', e.subcategory,
            'date', e.date,
            'participants', (
              SELECT COALESCE(
                json_agg(
                  json_build_object(
                    'user', json_build_object(
                      'id', participant_user.id,
                      'name', participant_user.name
                    ),
                    'amount', ep.share_amount,
                    'percent', ep.share_percent
                  )
                  ORDER BY participant_user.name
                ),
                '[]'::json
              )
              FROM expense_participants ep
              JOIN users participant_user ON participant_user.id = ep.user_id
              WHERE ep.expense_id = e.id
            ),
            'attachment_data_url', e.attachment_data_url,
            'createdAt', e.created_at,
            'updatedAt', e.updated_at
          )
          ORDER BY e.date DESC, e.created_at DESC
        ),
        '[]'::json
      )
      FROM expenses e
      LEFT JOIN users payer_user ON payer_user.id = e.paid_by_user_id
      WHERE e.group_id = v_group.id
    )
  );
END;
$$;
