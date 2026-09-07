begin;

create table public.certificate_revocation_history (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.participation_certificates(id) on delete restrict,
  revoked_by uuid references public.profiles(id) on delete set null,
  reason text not null check(char_length(reason) between 5 and 200),
  occurred_at timestamptz not null default now()
);

create index certificate_revocation_history_certificate_idx
  on public.certificate_revocation_history(certificate_id,occurred_at desc);

alter table public.certificate_revocation_history enable row level security;
create policy certificate_revocation_history_admin_read on public.certificate_revocation_history
  for select to authenticated using(public.is_global_admin());
revoke all on public.certificate_revocation_history from anon,authenticated;
grant select on public.certificate_revocation_history to authenticated;

create or replace function public.get_admin_certificates(
  search_term text default null,
  target_class_id uuid default null,
  selected_status text default 'all'
)
returns table(
  certificate_id uuid, participant_name text, class_id uuid, class_name text,
  completed_missions integer, competencies text[], estimated_hours numeric,
  issued_at timestamptz, revoked_at timestamptz, verification_code uuid,
  revocation_reason text
)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  if selected_status not in ('all','valid','revoked') then raise exception 'INVALID_CERTIFICATE_STATUS' using errcode='22023'; end if;
  return query
  select cert.id,cert.participant_name,cert.class_id,cert.class_name,cert.completed_missions,
    cert.competencies,cert.estimated_hours,cert.issued_at,cert.revoked_at,cert.verification_code,
    history.reason
  from public.participation_certificates cert
  left join lateral (
    select event.reason from public.certificate_revocation_history event
    where event.certificate_id=cert.id order by event.occurred_at desc limit 1
  ) history on true
  where (target_class_id is null or cert.class_id=target_class_id)
    and (nullif(btrim(search_term),'') is null or cert.participant_name ilike '%'||btrim(search_term)||'%')
    and (selected_status='all' or selected_status='valid' and cert.revoked_at is null or selected_status='revoked' and cert.revoked_at is not null)
  order by cert.issued_at desc;
end $$;

create or replace function public.admin_revoke_certificate(target_certificate_id uuid, revocation_reason text)
returns boolean language plpgsql security definer set search_path='' as $$
declare changed boolean;
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  if char_length(btrim(revocation_reason)) not between 5 and 200 then raise exception 'INVALID_REVOCATION_REASON' using errcode='22023'; end if;
  update public.participation_certificates set revoked_at=now()
    where id=target_certificate_id and revoked_at is null;
  changed:=found;
  if changed then
    insert into public.certificate_revocation_history(certificate_id,revoked_by,reason)
      values(target_certificate_id,auth.uid(),btrim(revocation_reason));
  end if;
  return changed;
end $$;

revoke all on function public.get_admin_certificates(text,uuid,text),public.admin_revoke_certificate(uuid,text) from public;
grant execute on function public.get_admin_certificates(text,uuid,text),public.admin_revoke_certificate(uuid,text) to authenticated;

commit;
