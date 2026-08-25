begin;

alter table public.help_requests
  add column reason_code text not null default 'stuck_step'
    check (reason_code in ('stuck_step', 'needs_explanation', 'accessibility_support')),
  add column resolution_code text
    check (resolution_code is null or resolution_code in ('review_hint', 'try_again', 'scheduled_support', 'guided_by_monitor'));

create unique index help_requests_one_active_context_idx
  on public.help_requests (participant_id, attempt_id, step_id)
  where status in ('open', 'in_progress') and attempt_id is not null and step_id is not null;

create table public.help_request_history (
  id bigint generated always as identity primary key,
  help_request_id uuid not null references public.help_requests(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  from_status public.help_request_status,
  to_status public.help_request_status not null,
  resolution_code text,
  occurred_at timestamptz not null default now()
);
create index help_request_history_request_idx on public.help_request_history(help_request_id, occurred_at, id);
alter table public.help_request_history enable row level security;
create policy help_history_select_scope on public.help_request_history for select to authenticated using (
  exists (select 1 from public.help_requests request where request.id = help_request_id and (
    (request.participant_id = auth.uid() and public.has_active_class_role(request.class_id, 'participant'))
    or public.is_class_monitor(request.class_id)
  ))
);
grant select on public.help_request_history to authenticated;

create or replace function public.audit_help_request_status() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status or new.resolution_code is distinct from old.resolution_code then
    insert into public.help_request_history(help_request_id, actor_id, from_status, to_status, resolution_code)
    values (new.id, coalesce(auth.uid(), new.participant_id), case when tg_op = 'UPDATE' then old.status end, new.status, new.resolution_code);
  end if;
  return new;
end;
$$;
create trigger help_requests_audit after insert or update on public.help_requests
for each row execute function public.audit_help_request_status();

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null unique check (expo_push_token ~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$|^ExpoPushToken\[[A-Za-z0-9_-]+\]$'),
  platform text not null check (platform in ('android','ios')),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from authenticated, anon;

create table public.push_outbox (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  help_request_id uuid not null references public.help_requests(id) on delete cascade,
  event_type text not null check (event_type in ('help_requested','help_updated')),
  title text not null default 'Celular Sem Medo',
  body text not null default 'Você tem uma atualização no aplicativo.',
  route text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts smallint not null default 0,
  last_error text
);
create index push_outbox_pending_idx on public.push_outbox(created_at) where processed_at is null;
alter table public.push_outbox enable row level security;
revoke all on public.push_outbox from authenticated, anon;

create or replace function public.queue_help_push() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.push_outbox(recipient_id, help_request_id, event_type, body, route)
    select membership.user_id, new.id, 'help_requested', 'Há um novo pedido de ajuda no aplicativo.',
      '/monitor/help-requests?id=' || new.id::text
    from public.memberships membership
    where membership.class_id = new.class_id and membership.role = 'monitor' and membership.status = 'active';
  elsif new.status is distinct from old.status or new.resolution_code is distinct from old.resolution_code then
    insert into public.push_outbox(recipient_id, help_request_id, event_type, body, route)
    values (new.participant_id, new.id, 'help_updated', 'Seu pedido de ajuda foi atualizado.', '/participant/help-requests?id=' || new.id::text);
  end if;
  return new;
end;
$$;
create trigger help_requests_queue_push after insert or update on public.help_requests
for each row execute function public.queue_help_push();

create or replace function public.create_help_request(requested_id uuid, target_attempt_id uuid, target_step_id uuid, target_reason_code text default 'stuck_step')
returns table (help_request_id uuid, request_status public.help_request_status)
language plpgsql security definer set search_path = '' as $$
declare selected_attempt public.attempts%rowtype; selected_id uuid;
begin
  if target_reason_code not in ('stuck_step','needs_explanation','accessibility_support') then raise exception 'INVALID_HELP_REASON' using errcode='22023'; end if;
  select * into selected_attempt from public.attempts attempt
  where attempt.id = target_attempt_id and attempt.participant_id = auth.uid()
    and public.has_active_class_role(attempt.class_id, 'participant');
  if not found then raise exception 'HELP_CONTEXT_NOT_FOUND' using errcode='42501'; end if;
  if not exists (select 1 from public.mission_steps step where step.id = target_step_id and step.mission_version_id = selected_attempt.mission_version_id) then
    raise exception 'HELP_CONTEXT_NOT_FOUND' using errcode='42501';
  end if;
  select request.id into selected_id from public.help_requests request
  where request.participant_id = auth.uid() and request.attempt_id = target_attempt_id
    and request.step_id = target_step_id and request.status in ('open','in_progress') limit 1;
  if selected_id is null then
    insert into public.help_requests(id,class_id,participant_id,attempt_id,mission_version_id,step_id,reason_code)
    values(requested_id,selected_attempt.class_id,auth.uid(),selected_attempt.id,selected_attempt.mission_version_id,target_step_id,target_reason_code)
    returning id into selected_id;
  end if;
  return query select request.id, request.status from public.help_requests request where request.id = selected_id;
end;
$$;

create or replace function public.get_my_help_requests()
returns table (help_request_id uuid, status public.help_request_status, reason_code text, resolution_code text, mission_title text, step_title text, requested_at timestamptz, acknowledged_at timestamptz, resolved_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select request.id,request.status,request.reason_code,request.resolution_code,version.title,step.title,request.requested_at,request.acknowledged_at,request.resolved_at
  from public.help_requests request join public.mission_versions version on version.id=request.mission_version_id
  left join public.mission_steps step on step.id=request.step_id
  where request.participant_id=auth.uid() and public.has_active_class_role(request.class_id,'participant')
  order by request.requested_at desc;
$$;

create or replace function public.get_monitor_help_requests(target_class_id uuid)
returns table (help_request_id uuid, participant_id uuid, participant_name text, status public.help_request_status, reason_code text, resolution_code text, mission_title text, step_title text, requested_at timestamptz, acknowledged_at timestamptz, resolved_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_class_monitor(target_class_id) then raise exception 'CLASS_ACCESS_DENIED' using errcode='42501'; end if;
  return query select request.id,request.participant_id,profile.display_name,request.status,request.reason_code,request.resolution_code,version.title,step.title,request.requested_at,request.acknowledged_at,request.resolved_at
  from public.help_requests request join public.profiles profile on profile.id=request.participant_id
  join public.mission_versions version on version.id=request.mission_version_id left join public.mission_steps step on step.id=request.step_id
  where request.class_id=target_class_id order by case request.status when 'open' then 0 when 'in_progress' then 1 else 2 end,request.requested_at;
end;
$$;

create or replace function public.update_help_request(target_help_request_id uuid, target_status public.help_request_status, target_resolution_code text default null)
returns public.help_request_status language plpgsql security definer set search_path = '' as $$
declare request public.help_requests%rowtype;
begin
  select * into request from public.help_requests where id=target_help_request_id for update;
  if not found or not public.is_class_monitor(request.class_id) then raise exception 'HELP_REQUEST_NOT_FOUND' using errcode='42501'; end if;
  if target_status not in ('in_progress','resolved') then raise exception 'INVALID_HELP_STATUS' using errcode='22023'; end if;
  if target_status='resolved' and target_resolution_code not in ('review_hint','try_again','scheduled_support','guided_by_monitor') then raise exception 'RESOLUTION_REQUIRED' using errcode='22023'; end if;
  update public.help_requests set status=target_status,assigned_monitor_id=auth.uid(),resolution_code=case when target_status='resolved' then target_resolution_code else null end where id=request.id returning status into request.status;
  return request.status;
end;
$$;

create or replace function public.cancel_my_help_request(target_help_request_id uuid)
returns public.help_request_status language plpgsql security definer set search_path = '' as $$
declare result public.help_request_status;
begin
  update public.help_requests set status='cancelled' where id=target_help_request_id and participant_id=auth.uid() and status='open' returning status into result;
  if result is null then raise exception 'HELP_REQUEST_NOT_CANCELLABLE' using errcode='42501'; end if;
  return result;
end;
$$;

create or replace function public.register_push_device(target_token text,target_platform text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if target_platform not in ('android','ios') or target_token !~ '^ExponentPushToken\[[A-Za-z0-9_-]+\]$|^ExpoPushToken\[[A-Za-z0-9_-]+\]$' then raise exception 'INVALID_PUSH_DEVICE' using errcode='22023'; end if;
  insert into public.push_devices(user_id,expo_push_token,platform) values(auth.uid(),target_token,target_platform)
  on conflict(expo_push_token) do update set user_id=auth.uid(),platform=excluded.platform,enabled=true,last_seen_at=now()
  returning id into result; return result;
end;
$$;
create or replace function public.unregister_push_device(target_token text) returns boolean
language sql security definer set search_path = '' as $$ delete from public.push_devices where user_id=auth.uid() and expo_push_token=target_token returning true; $$;

revoke all on function public.create_help_request(uuid,uuid,uuid,text), public.get_my_help_requests(), public.get_monitor_help_requests(uuid), public.update_help_request(uuid,public.help_request_status,text), public.cancel_my_help_request(uuid), public.register_push_device(text,text), public.unregister_push_device(text) from public;
grant execute on function public.create_help_request(uuid,uuid,uuid,text), public.get_my_help_requests(), public.get_monitor_help_requests(uuid), public.update_help_request(uuid,public.help_request_status,text), public.cancel_my_help_request(uuid), public.register_push_device(text,text), public.unregister_push_device(text) to authenticated;

commit;
