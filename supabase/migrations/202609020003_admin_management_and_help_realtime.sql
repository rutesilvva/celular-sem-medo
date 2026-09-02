begin;

create or replace function public.get_admin_classes()
returns table (class_id uuid, class_name text, class_slug text, class_shift text,
  class_status public.class_status, participant_count bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  return query select class.id, class.name, class.slug, class.shift, class.status,
    count(membership.id) filter (where membership.role='participant' and membership.status='active'), class.created_at
  from public.classes class left join public.memberships membership on membership.class_id=class.id
  group by class.id order by class.status, class.name;
end; $$;

create or replace function public.get_admin_users()
returns table (user_id uuid, display_name text, email text, avatar_url text,
  account_status public.account_status, is_administrator boolean, active_class_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  return query select profile.id, profile.display_name, auth_user.email::text, profile.avatar_url,
    profile.account_status, coalesce(administrator.status='active', false),
    count(distinct membership.class_id) filter (where membership.role='participant' and membership.status='active')
  from public.profiles profile join auth.users auth_user on auth_user.id=profile.id
  left join public.administrators administrator on administrator.user_id=profile.id
  left join public.memberships membership on membership.user_id=profile.id
  group by profile.id, auth_user.email, administrator.status order by profile.display_name;
end; $$;

create or replace function public.admin_create_class(class_name text, class_slug text, class_shift text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  insert into public.classes(name,slug,shift,created_by)
  values(btrim(class_name),lower(btrim(class_slug)),nullif(btrim(class_shift),''),auth.uid()) returning id into result;
  return result;
end; $$;

create or replace function public.admin_update_class(target_class_id uuid, class_name text, class_shift text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  update public.classes set name=btrim(class_name), shift=nullif(btrim(class_shift),''), updated_at=now() where id=target_class_id;
  return found;
end; $$;

create or replace function public.admin_archive_class(target_class_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed boolean;
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  update public.classes set status='archived', updated_at=now() where id=target_class_id and status='active';
  changed := found;
  if changed then insert into public.admin_audit_events(admin_user_id,action,class_id) values(auth.uid(),'class_archived',target_class_id); end if;
  return changed;
end; $$;

create or replace function public.admin_add_student(target_class_id uuid, target_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=target_user_id and account_status='active') then raise exception 'ACCOUNT_NOT_ACTIVE' using errcode='22023'; end if;
  insert into public.memberships(class_id,user_id,role,status,ended_at)
  values(target_class_id,target_user_id,'participant','active',null)
  on conflict(class_id,user_id,role) do update set status='active',ended_at=null,updated_at=now();
  return true;
end; $$;

create or replace function public.admin_grant_administrator(target_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  if target_user_id=auth.uid() then return true; end if;
  insert into public.administrators(user_id,status,granted_by,revoked_at)
  values(target_user_id,'active',auth.uid(),null)
  on conflict(user_id) do update set status='active',granted_by=auth.uid(),granted_at=now(),revoked_at=null,updated_at=now();
  insert into public.admin_audit_events(admin_user_id,action,target_user_id) values(auth.uid(),'administrator_granted',target_user_id);
  return true;
end; $$;

create or replace function public.admin_revoke_administrator(target_user_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed boolean;
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  if target_user_id=auth.uid() then raise exception 'CURRENT_SESSION_PROTECTED' using errcode='22023'; end if;
  update public.administrators set status='revoked',revoked_at=now(),updated_at=now() where user_id=target_user_id and status='active';
  changed := found;
  if changed then insert into public.admin_audit_events(admin_user_id,action,target_user_id) values(auth.uid(),'administrator_revoked',target_user_id); end if;
  return changed;
end; $$;

create or replace function public.get_help_request_history(target_help_request_id uuid)
returns table(history_id bigint, actor_id uuid, from_status public.help_request_status,
  to_status public.help_request_status, resolution_code text, occurred_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.help_requests request where request.id=target_help_request_id
    and (request.participant_id=auth.uid() or public.is_global_admin())) then
    raise exception 'HELP_REQUEST_NOT_FOUND' using errcode='42501';
  end if;
  return query select history.id,history.actor_id,history.from_status,history.to_status,history.resolution_code,history.occurred_at
  from public.help_request_history history where history.help_request_id=target_help_request_id order by history.occurred_at,history.id;
end; $$;

do $$ begin
  alter publication supabase_realtime add table public.help_requests;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.help_request_history;
exception when duplicate_object then null; end $$;

revoke all on function public.get_admin_classes(), public.get_admin_users(), public.admin_create_class(text,text,text),
  public.admin_update_class(uuid,text,text), public.admin_archive_class(uuid), public.admin_add_student(uuid,uuid),
  public.admin_grant_administrator(uuid), public.admin_revoke_administrator(uuid), public.get_help_request_history(uuid) from public;
grant execute on function public.get_admin_classes(), public.get_admin_users(), public.admin_create_class(text,text,text),
  public.admin_update_class(uuid,text,text), public.admin_archive_class(uuid), public.admin_add_student(uuid,uuid),
  public.admin_grant_administrator(uuid), public.admin_revoke_administrator(uuid), public.get_help_request_history(uuid) to authenticated;

commit;
