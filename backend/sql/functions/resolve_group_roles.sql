-- Usage: supabase.rpc('resolve_group_role', { user_id, group_id })
-- Roles returned: 'owner', 'member', 'invitee', null

create or replace function resolve_group_role(user_id uuid, group_id uuid)
returns text
language plpgsql
as $$
begin
  if exists (
    select 1 from groups where id = group_id and owner_id = user_id
  ) then
    return 'owner';
  elsif exists (
    select 1 from group_members where group_id = group_id and user_id = user_id
  ) then
    return 'member';
  elsif exists (
    select 1 from group_invites where group_id = group_id and invited_user_id = user_id
  ) then
    return 'invitee';
  else
    return null;
  end if;
end;
$$;
