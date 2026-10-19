


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."auth_provider_enum" AS ENUM (
    'email',
    'google',
    'apple',
    'github',
    'facebook'
);


ALTER TYPE "public"."auth_provider_enum" OWNER TO "postgres";


CREATE TYPE "public"."blog_status" AS ENUM (
    'draft',
    'published'
);


ALTER TYPE "public"."blog_status" OWNER TO "postgres";


CREATE TYPE "public"."split_type_enum" AS ENUM (
    'custom',
    'equal',
    'percentage'
);


ALTER TYPE "public"."split_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_expense"("p_group_id" "uuid", "p_description" "text", "p_amount" numeric, "p_currency" "text", "p_paid_by_user_id" "uuid" DEFAULT NULL::"uuid", "p_split_type" "text" DEFAULT 'equal'::"text", "p_category" "text" DEFAULT 'uncategorized'::"text", "p_subcategory" "text" DEFAULT 'general'::"text", "p_date" "date" DEFAULT CURRENT_DATE, "p_participants" "jsonb" DEFAULT '[]'::"jsonb", "p_payers" "jsonb" DEFAULT NULL::"jsonb", "p_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_expense expenses;
BEGIN
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


ALTER FUNCTION "public"."add_expense"("p_group_id" "uuid", "p_description" "text", "p_amount" numeric, "p_currency" "text", "p_paid_by_user_id" "uuid", "p_split_type" "text", "p_category" "text", "p_subcategory" "text", "p_date" "date", "p_participants" "jsonb", "p_payers" "jsonb", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_group_revision"("p_group_id" "uuid", "p_expected_revision" bigint DEFAULT NULL::bigint) RETURNS bigint
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."bump_group_revision"("p_group_id" "uuid", "p_expected_revision" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_orphan_users"("p_user_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  delete from users u
  where u.id = any(coalesce(p_user_ids, array[]::uuid[]))
    and not exists (
      select 1
      from group_members gm
      where gm.user_id = u.id
        and gm.is_active = true
    )
    and not exists (
      select 1
      from expenses e
      where e.paid_by_user_id = u.id
    )
    and not exists (
      select 1
      from expense_participants ep
      where ep.user_id = u.id
    );
end;
$$;


ALTER FUNCTION "public"."cleanup_orphan_users"("p_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_expense_attachment"("p_expense_id" "uuid", "p_expected_path" "text" DEFAULT NULL::"text") RETURNS TABLE("previous_path" "text")
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."clear_expense_attachment"("p_expense_id" "uuid", "p_expected_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_group_with_members"("group_name" "text", "group_currency" "text", "member_names" "text"[]) RETURNS json
    LANGUAGE "plpgsql"
    AS $$
declare
  new_group_id uuid;
begin
  -- Create group
  insert into groups (name, currency)
  values (group_name, group_currency)
  returning id into new_group_id;

  -- Create users + members in one go
  with inserted_users as (
    insert into users (name)
    select unnest(member_names)
    returning id, name
  )
  insert into group_members (group_id, user_id, role)
  select new_group_id, id, 'member'
  from inserted_users;

  return json_build_object(
    'id', new_group_id,
    'name', group_name,
    'currency', group_currency,
    'members', (
      select json_agg(json_build_object(
        'id', u.id,
        'name', u.name
      ))
      from users u
      join group_members gm on gm.user_id = u.id
      where gm.group_id = new_group_id
    )
  );
end;
$$;


ALTER FUNCTION "public"."create_group_with_members"("group_name" "text", "group_currency" "text", "member_names" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_expense"("p_expense_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  DELETE FROM public.expenses WHERE id = p_expense_id;
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."delete_expense"("p_expense_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_group_and_cleanup_users"("p_group_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_user_ids uuid[];
begin
  select coalesce(array_agg(distinct gm.user_id), array[]::uuid[])
  into v_user_ids
  from group_members gm
  where gm.group_id = p_group_id;

  delete from groups
  where id = p_group_id;

  perform cleanup_orphan_users(v_user_ids);
end;
$$;


ALTER FUNCTION "public"."delete_group_and_cleanup_users"("p_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."edit_expense"("p_group_id" "uuid", "p_expense_id" "uuid", "p_description" "text", "p_amount" numeric, "p_currency" "text", "p_paid_by_user_id" "uuid" DEFAULT NULL::"uuid", "p_split_type" "text" DEFAULT 'equal'::"text", "p_category" "text" DEFAULT 'general'::"text", "p_subcategory" "text" DEFAULT 'general'::"text", "p_date" "date" DEFAULT CURRENT_DATE, "p_participants" "jsonb" DEFAULT '[]'::"jsonb", "p_payers" "jsonb" DEFAULT NULL::"jsonb", "p_notes" "text" DEFAULT NULL::"text", "p_expected_revision" bigint DEFAULT NULL::bigint) RETURNS TABLE("id" "uuid", "group_id" "uuid", "description" "text", "notes" "text", "amount" numeric, "currency" "text", "paid_by_user_id" "uuid", "paid_by_name" "text", "split_type" "text", "category" "text", "subcategory" "text", "date" "date", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "revision" bigint)
    LANGUAGE "plpgsql"
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
      revision = e.revision + 1
  WHERE e.id = p_expense_id
    AND e.group_id = p_group_id
    AND e.revision = p_expected_revision;

  IF NOT FOUND THEN
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


ALTER FUNCTION "public"."edit_expense"("p_group_id" "uuid", "p_expense_id" "uuid", "p_description" "text", "p_amount" numeric, "p_currency" "text", "p_paid_by_user_id" "uuid", "p_split_type" "text", "p_category" "text", "p_subcategory" "text", "p_date" "date", "p_participants" "jsonb", "p_payers" "jsonb", "p_notes" "text", "p_expected_revision" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_blog_slug_redirect_ownership"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_blog_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended('splitcost:blog-public-slug:' || NEW.old_slug, 0)
  );

  SELECT blog.id
  INTO current_blog_id
  FROM public.blogs AS blog
  WHERE blog.slug = NEW.old_slug
    AND blog.status = 'published';

  IF FOUND AND (NEW.blog_id IS NULL OR NEW.blog_id <> current_blog_id) THEN
    RAISE EXCEPTION 'Blog slug % is already a current published URL', NEW.old_slug
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."guard_blog_slug_redirect_ownership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_local_group"("p_group_id" "uuid", "p_payload_hash" "text", "p_name" "text", "p_currency" "text", "p_created_at" timestamp with time zone, "p_members" "jsonb", "p_expenses" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."import_local_group"("p_group_id" "uuid", "p_payload_hash" "text", "p_name" "text", "p_currency" "text", "p_created_at" timestamp with time zone, "p_members" "jsonb", "p_expenses" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_blog_view"("p_blog_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.blogs
  SET views = views + 1
  WHERE id = p_blog_id
    AND status = 'published';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;


ALTER FUNCTION "public"."increment_blog_view"("p_blog_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."load_group_details"("group_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$DECLARE
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
END;$$;


ALTER FUNCTION "public"."load_group_details"("group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."load_group_summaries"("p_group_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS json
    LANGUAGE "sql" STABLE
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


ALTER FUNCTION "public"."load_group_summaries"("p_group_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_expense_attachment"("p_expense_id" "uuid", "p_attachment_path" "text") RETURNS TABLE("previous_path" "text")
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."replace_expense_attachment"("p_expense_id" "uuid", "p_attachment_path" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_blog_category_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_blog_category_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_blog_draft_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_blog_draft_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_blog_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.status <> 'published'
    AND NEW.status = 'published'
    AND NEW.published_at IS NULL
  THEN
    NEW.published_at = now();
  END IF;

  IF ROW(
    NEW.title,
    NEW.slug,
    NEW.excerpt,
    NEW.content,
    NEW.cover_image,
    NEW.cover_alt,
    NEW.category,
    NEW.author,
    NEW.status,
    NEW.published_at,
    NEW.reading_time,
    NEW.no_index,
    NEW.is_featured
  ) IS DISTINCT FROM ROW(
    OLD.title,
    OLD.slug,
    OLD.excerpt,
    OLD.content,
    OLD.cover_image,
    OLD.cover_alt,
    OLD.category,
    OLD.author,
    OLD.status,
    OLD.published_at,
    OLD.reading_time,
    OLD.no_index,
    OLD.is_featured
  ) THEN
    NEW.updated_at = now();
  ELSE
    NEW.updated_at = OLD.updated_at;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_blog_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_expense_category"("p_expense_id" "uuid", "p_category" "text", "p_subcategory" "text", "p_expected_category" "text", "p_expected_subcategory" "text") RETURNS TABLE("id" "uuid", "group_id" "uuid", "category" "text", "subcategory" "text", "updated_at" timestamp with time zone, "revision" bigint)
    LANGUAGE "plpgsql"
    AS $$
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


ALTER FUNCTION "public"."set_expense_category"("p_expense_id" "uuid", "p_category" "text", "p_subcategory" "text", "p_expected_category" "text", "p_expected_subcategory" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tombstone_deleted_blog_slugs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  locked_slug text;
  was_public boolean;
BEGIN
  was_public := OLD.status = 'published'
    OR OLD.published_at IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM public.blog_slug_redirects AS redirect
      WHERE redirect.blog_id = OLD.id
    );

  IF was_public AND OLD.slug IS NOT NULL THEN
    locked_slug := OLD.slug;
    PERFORM pg_advisory_xact_lock(
      hashtextextended('splitcost:blog-public-slug:' || locked_slug, 0)
    );

    INSERT INTO public.blog_slug_redirects (old_slug, blog_id)
    VALUES (OLD.slug, OLD.id)
    ON CONFLICT (old_slug) DO NOTHING;
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."tombstone_deleted_blog_slugs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_published_blog_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  conflicting_blog_id uuid;
  locked_slug text;
BEGIN
  FOR locked_slug IN
    SELECT DISTINCT candidate.slug
    FROM unnest(
      CASE
        WHEN TG_OP = 'INSERT' THEN ARRAY[NEW.slug]
        ELSE ARRAY[OLD.slug, NEW.slug]
      END
    ) AS candidate(slug)
    WHERE candidate.slug IS NOT NULL
    ORDER BY candidate.slug
  LOOP
    PERFORM pg_advisory_xact_lock(
      hashtextextended('splitcost:blog-public-slug:' || locked_slug, 0)
    );
  END LOOP;

  IF NEW.status = 'published' AND NEW.slug IS NOT NULL THEN
    SELECT redirect.blog_id
    INTO conflicting_blog_id
    FROM public.blog_slug_redirects AS redirect
    WHERE redirect.old_slug = NEW.slug;

    IF FOUND AND (conflicting_blog_id IS NULL OR conflicting_blog_id <> NEW.id) THEN
      RAISE EXCEPTION 'Blog slug % is reserved by a published URL', NEW.slug
        USING ERRCODE = 'unique_violation';
    END IF;

    DELETE FROM public.blog_slug_redirects
    WHERE old_slug = NEW.slug
      AND blog_id = NEW.id;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.status = 'published'
    AND OLD.slug IS NOT NULL
    AND NEW.slug IS DISTINCT FROM OLD.slug
  THEN
    INSERT INTO public.blog_slug_redirects (old_slug, blog_id)
    VALUES (OLD.slug, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_published_blog_slug"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "expense_id" "uuid",
    "kind" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "actor_user_id" "uuid",
    "actor_name" "text",
    "origin_session_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_events_kind_check" CHECK (("kind" = ANY (ARRAY['group_created'::"text", 'group_renamed'::"text", 'member_added'::"text", 'member_renamed'::"text", 'member_removed'::"text", 'expense_added'::"text", 'expense_updated'::"text", 'expense_deleted'::"text", 'settlement_added'::"text", 'settlement_deleted'::"text"])))
);


ALTER TABLE "public"."activity_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."blog_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blog_id" "uuid" NOT NULL,
    "title" "text",
    "slug" "text",
    "excerpt" "text",
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "cover_image" "text",
    "cover_alt" "text",
    "category" "text",
    "author" "text",
    "published_at" timestamp with time zone,
    "reading_time" integer DEFAULT 1 NOT NULL,
    "no_index" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    CONSTRAINT "blog_drafts_reading_time_positive" CHECK (("reading_time" > 0))
);


ALTER TABLE "public"."blog_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_slug_redirects" (
    "old_slug" "text" NOT NULL,
    "blog_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "blog_slug_redirects_old_slug_not_empty" CHECK (("length"("btrim"("old_slug")) > 0))
);


ALTER TABLE "public"."blog_slug_redirects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blogs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "slug" "text",
    "excerpt" "text",
    "content" "text" DEFAULT ''::"text",
    "cover_image" "text",
    "category" "text",
    "author" "text" DEFAULT 'SplitCost Team'::"text" NOT NULL,
    "status" "public"."blog_status" DEFAULT 'draft'::"public"."blog_status" NOT NULL,
    "published_at" timestamp with time zone,
    "reading_time" integer DEFAULT 1 NOT NULL,
    "views" integer DEFAULT 0 NOT NULL,
    "no_index" boolean DEFAULT false NOT NULL,
    "cover_alt" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    CONSTRAINT "blogs_reading_time_positive" CHECK (("reading_time" > 0)),
    CONSTRAINT "blogs_views_nonnegative" CHECK (("views" >= 0))
);


ALTER TABLE "public"."blogs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "share_amount" numeric,
    "share_percent" numeric
);


ALTER TABLE "public"."expense_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expense_payers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL
);


ALTER TABLE "public"."expense_payers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" NOT NULL,
    "paid_by_user_id" "uuid",
    "split_type" "public"."split_type_enum" NOT NULL,
    "category" "text" NOT NULL,
    "subcategory" "text" NOT NULL,
    "date" "date" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attachment_data_url" "text",
    "notes" "text",
    "revision" bigint DEFAULT 1 NOT NULL,
    CONSTRAINT "expenses_notes_length" CHECK ((("notes" IS NULL) OR ("char_length"("notes") <= 10000)))
);

ALTER TABLE ONLY "public"."expenses" REPLICA IDENTITY FULL;


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_imports" (
    "group_id" "uuid" NOT NULL,
    "payload_hash" "text" NOT NULL,
    "imported_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."group_imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text",
    "nickname" "text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "currency" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "revision" bigint DEFAULT 1 NOT NULL
);

ALTER TABLE ONLY "public"."groups" REPLICA IDENTITY FULL;


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "avatar_url" "text",
    "auth_provider" "public"."auth_provider_enum",
    "is_email_verified" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_categories"
    ADD CONSTRAINT "blog_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."blog_categories"
    ADD CONSTRAINT "blog_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_categories"
    ADD CONSTRAINT "blog_categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."blog_drafts"
    ADD CONSTRAINT "blog_drafts_blog_id_key" UNIQUE ("blog_id");



ALTER TABLE ONLY "public"."blog_drafts"
    ADD CONSTRAINT "blog_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_slug_redirects"
    ADD CONSTRAINT "blog_slug_redirects_pkey" PRIMARY KEY ("old_slug");



ALTER TABLE ONLY "public"."blogs"
    ADD CONSTRAINT "blogs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blogs"
    ADD CONSTRAINT "blogs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."expense_participants"
    ADD CONSTRAINT "expense_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_payers"
    ADD CONSTRAINT "expense_payers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expense_payers"
    ADD CONSTRAINT "expense_payers_unique" UNIQUE ("expense_id", "user_id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_imports"
    ADD CONSTRAINT "group_imports_pkey" PRIMARY KEY ("group_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "activity_events_expense_idx" ON "public"."activity_events" USING "btree" ("expense_id", "created_at" DESC) WHERE ("expense_id" IS NOT NULL);



CREATE INDEX "activity_events_group_feed_idx" ON "public"."activity_events" USING "btree" ("group_id", "created_at" DESC, "id" DESC);



CREATE INDEX "blog_categories_sort_order_idx" ON "public"."blog_categories" USING "btree" ("sort_order", "name");



CREATE INDEX "blog_slug_redirects_blog_id_idx" ON "public"."blog_slug_redirects" USING "btree" ("blog_id");



CREATE INDEX "blogs_category_status_idx" ON "public"."blogs" USING "btree" ("category", "status", "published_at" DESC);



CREATE INDEX "blogs_featured_status_published_at_idx" ON "public"."blogs" USING "btree" ("is_featured" DESC, "status", "published_at" DESC);



CREATE INDEX "blogs_status_published_at_idx" ON "public"."blogs" USING "btree" ("status", "published_at" DESC);



CREATE INDEX "blogs_views_idx" ON "public"."blogs" USING "btree" ("views" DESC);



CREATE INDEX "idx_expense_participants_expense" ON "public"."expense_participants" USING "btree" ("expense_id");



CREATE INDEX "idx_expense_participants_user" ON "public"."expense_participants" USING "btree" ("user_id");



CREATE INDEX "idx_expense_payers_user" ON "public"."expense_payers" USING "btree" ("user_id");



CREATE INDEX "idx_expenses_group_activity" ON "public"."expenses" USING "btree" ("group_id", "date" DESC, "created_at" DESC);



CREATE INDEX "idx_expenses_group_paid_by" ON "public"."expenses" USING "btree" ("group_id", "paid_by_user_id");



CREATE INDEX "idx_group_members_group_active" ON "public"."group_members" USING "btree" ("group_id", "is_active");



CREATE INDEX "idx_group_members_user" ON "public"."group_members" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "guard_blog_slug_redirect_ownership" BEFORE INSERT OR UPDATE OF "old_slug", "blog_id" ON "public"."blog_slug_redirects" FOR EACH ROW EXECUTE FUNCTION "public"."guard_blog_slug_redirect_ownership"();



CREATE OR REPLACE TRIGGER "set_blog_category_updated_at" BEFORE UPDATE ON "public"."blog_categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_blog_category_updated_at"();



CREATE OR REPLACE TRIGGER "set_blog_drafts_updated_at" BEFORE UPDATE ON "public"."blog_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."set_blog_draft_updated_at"();



CREATE OR REPLACE TRIGGER "set_blog_updated_at" BEFORE UPDATE ON "public"."blogs" FOR EACH ROW EXECUTE FUNCTION "public"."set_blog_updated_at"();



CREATE OR REPLACE TRIGGER "tombstone_deleted_blog_slugs" BEFORE DELETE ON "public"."blogs" FOR EACH ROW EXECUTE FUNCTION "public"."tombstone_deleted_blog_slugs"();



CREATE OR REPLACE TRIGGER "track_published_blog_slug_on_insert" BEFORE INSERT ON "public"."blogs" FOR EACH ROW EXECUTE FUNCTION "public"."track_published_blog_slug"();



CREATE OR REPLACE TRIGGER "track_published_blog_slug_on_update" BEFORE UPDATE OF "slug", "status" ON "public"."blogs" FOR EACH ROW EXECUTE FUNCTION "public"."track_published_blog_slug"();



ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_events"
    ADD CONSTRAINT "activity_events_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_drafts"
    ADD CONSTRAINT "blog_drafts_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "public"."blogs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blog_slug_redirects"
    ADD CONSTRAINT "blog_slug_redirects_blog_id_fkey" FOREIGN KEY ("blog_id") REFERENCES "public"."blogs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."expense_participants"
    ADD CONSTRAINT "expense_participants_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_participants"
    ADD CONSTRAINT "expense_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."expense_payers"
    ADD CONSTRAINT "expense_payers_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expense_payers"
    ADD CONSTRAINT "expense_payers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_paid_by_user_id_fkey" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



CREATE POLICY "Allow public blog category reads" ON "public"."blog_categories" FOR SELECT USING (true);



CREATE POLICY "Allow public blog redirect reads" ON "public"."blog_slug_redirects" FOR SELECT USING (true);



CREATE POLICY "Allow public published blog reads" ON "public"."blogs" FOR SELECT USING (("status" = 'published'::"public"."blog_status"));



ALTER TABLE "public"."activity_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blog_slug_redirects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blogs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expense_payers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."expenses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."groups";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."add_expense"("p_group_id" "uuid", "p_description" "text", "p_amount" numeric, "p_currency" "text", "p_paid_by_user_id" "uuid", "p_split_type" "text", "p_category" "text", "p_subcategory" "text", "p_date" "date", "p_participants" "jsonb", "p_payers" "jsonb", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_expense"("p_group_id" "uuid", "p_description" "text", "p_amount" numeric, "p_currency" "text", "p_paid_by_user_id" "uuid", "p_split_type" "text", "p_category" "text", "p_subcategory" "text", "p_date" "date", "p_participants" "jsonb", "p_payers" "jsonb", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."bump_group_revision"("p_group_id" "uuid", "p_expected_revision" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bump_group_revision"("p_group_id" "uuid", "p_expected_revision" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_orphan_users"("p_user_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_orphan_users"("p_user_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."clear_expense_attachment"("p_expense_id" "uuid", "p_expected_path" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."clear_expense_attachment"("p_expense_id" "uuid", "p_expected_path" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_group_with_members"("group_name" "text", "group_currency" "text", "member_names" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_group_with_members"("group_name" "text", "group_currency" "text", "member_names" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_expense"("p_expense_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_expense"("p_expense_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_group_and_cleanup_users"("p_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_group_and_cleanup_users"("p_group_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."edit_expense"("p_group_id" "uuid", "p_expense_id" "uuid", "p_description" "text", "p_amount" numeric, "p_currency" "text", "p_paid_by_user_id" "uuid", "p_split_type" "text", "p_category" "text", "p_subcategory" "text", "p_date" "date", "p_participants" "jsonb", "p_payers" "jsonb", "p_notes" "text", "p_expected_revision" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."edit_expense"("p_group_id" "uuid", "p_expense_id" "uuid", "p_description" "text", "p_amount" numeric, "p_currency" "text", "p_paid_by_user_id" "uuid", "p_split_type" "text", "p_category" "text", "p_subcategory" "text", "p_date" "date", "p_participants" "jsonb", "p_payers" "jsonb", "p_notes" "text", "p_expected_revision" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_blog_slug_redirect_ownership"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_blog_slug_redirect_ownership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_blog_slug_redirect_ownership"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."import_local_group"("p_group_id" "uuid", "p_payload_hash" "text", "p_name" "text", "p_currency" "text", "p_created_at" timestamp with time zone, "p_members" "jsonb", "p_expenses" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."import_local_group"("p_group_id" "uuid", "p_payload_hash" "text", "p_name" "text", "p_currency" "text", "p_created_at" timestamp with time zone, "p_members" "jsonb", "p_expenses" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_blog_view"("p_blog_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_blog_view"("p_blog_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."load_group_details"("group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."load_group_details"("group_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."load_group_summaries"("p_group_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."load_group_summaries"("p_group_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."replace_expense_attachment"("p_expense_id" "uuid", "p_attachment_path" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."replace_expense_attachment"("p_expense_id" "uuid", "p_attachment_path" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_blog_category_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_blog_category_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_blog_category_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_blog_draft_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_blog_draft_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_blog_draft_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_blog_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_blog_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_blog_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_expense_category"("p_expense_id" "uuid", "p_category" "text", "p_subcategory" "text", "p_expected_category" "text", "p_expected_subcategory" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_expense_category"("p_expense_id" "uuid", "p_category" "text", "p_subcategory" "text", "p_expected_category" "text", "p_expected_subcategory" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."tombstone_deleted_blog_slugs"() TO "anon";
GRANT ALL ON FUNCTION "public"."tombstone_deleted_blog_slugs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tombstone_deleted_blog_slugs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."track_published_blog_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."track_published_blog_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."track_published_blog_slug"() TO "service_role";


















GRANT ALL ON TABLE "public"."activity_events" TO "anon";
GRANT ALL ON TABLE "public"."activity_events" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_events" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."blog_categories" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."blog_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_categories" TO "service_role";



GRANT ALL ON TABLE "public"."blog_drafts" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."blog_slug_redirects" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."blog_slug_redirects" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_slug_redirects" TO "service_role";



GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."blogs" TO "anon";
GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."blogs" TO "authenticated";
GRANT ALL ON TABLE "public"."blogs" TO "service_role";



GRANT ALL ON TABLE "public"."expense_participants" TO "service_role";



GRANT ALL ON TABLE "public"."expense_payers" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."group_imports" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































