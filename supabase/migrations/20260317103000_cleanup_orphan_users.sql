create or replace function cleanup_orphan_users(p_user_ids uuid[])
returns void
language plpgsql
as $$
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

create or replace function delete_group_and_cleanup_users(p_group_id uuid)
returns void
language plpgsql
as $$
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
