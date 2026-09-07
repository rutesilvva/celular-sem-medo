begin;

create table public.certificate_settings (
  id boolean primary key default true check(id),
  organization_name text not null default 'Celular Sem Medo' check(char_length(organization_name) between 2 and 100),
  signer_name text not null default 'Coordenação do projeto' check(char_length(signer_name) between 2 and 100),
  signer_title text not null default 'Responsável institucional' check(char_length(signer_title) between 2 and 100),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.certificate_settings(id) values(true);
alter table public.certificate_settings enable row level security;
create policy certificate_settings_read_authenticated on public.certificate_settings for select to authenticated using(true);
revoke all on public.certificate_settings from anon,authenticated;
grant select on public.certificate_settings to authenticated;

create table public.participation_certificates (
  id uuid primary key,
  verification_code uuid not null unique,
  participant_id uuid not null references public.profiles(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  participant_name text not null,
  class_name text not null,
  organization_name text not null,
  signer_name text not null,
  signer_title text not null,
  completed_missions integer not null check(completed_missions>=5),
  competencies text[] not null check(cardinality(competencies)>=3),
  estimated_hours numeric(6,1) not null check(estimated_hours>0),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(participant_id,class_id)
);
alter table public.participation_certificates enable row level security;
create policy certificates_read_own_or_admin on public.participation_certificates for select to authenticated
using(participant_id=auth.uid() or public.is_global_admin());
revoke all on public.participation_certificates from anon,authenticated;
grant select on public.participation_certificates to authenticated;

create table public.mission_quality_feedback (
  id uuid primary key,
  attempt_id uuid not null unique references public.attempts(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  assignment_id uuid not null references public.class_mission_assignments(id) on delete cascade,
  helpful smallint not null check(helpful between 1 and 5),
  clarity smallint not null check(clarity between 1 and 5),
  issue_codes text[] not null default '{}' check(issue_codes <@ array['text_difficult','audio_difficult','step_unclear','too_long','technical_problem','none']::text[]),
  created_at timestamptz not null default now()
);
alter table public.mission_quality_feedback enable row level security;
create policy feedback_read_own_or_admin on public.mission_quality_feedback for select to authenticated
using(participant_id=auth.uid() or public.is_global_admin());
revoke all on public.mission_quality_feedback from anon,authenticated;
grant select on public.mission_quality_feedback to authenticated;

create or replace function public.update_certificate_settings(selected_organization text,selected_signer text,selected_title text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  if char_length(btrim(selected_organization)) not between 2 and 100 or char_length(btrim(selected_signer)) not between 2 and 100 or char_length(btrim(selected_title)) not between 2 and 100 then raise exception 'INVALID_CERTIFICATE_SETTINGS' using errcode='22023'; end if;
  update public.certificate_settings set organization_name=btrim(selected_organization),signer_name=btrim(selected_signer),signer_title=btrim(selected_title),updated_by=auth.uid(),updated_at=now() where id;
  return true;
end $$;

create or replace function public.get_my_certificate_status()
returns table(eligible boolean,completed_missions bigint,competency_count bigint,retention_completed boolean,certificate_id uuid,verification_code uuid,participant_name text,class_name text,organization_name text,signer_name text,signer_title text,competencies text[],estimated_hours numeric,issued_at timestamptz)
language sql stable security definer set search_path='' as $$
  with membership as (
    select mem.class_id,c.name class_name from public.memberships mem join public.classes c on c.id=mem.class_id where mem.user_id=auth.uid() and mem.role='participant' and mem.status='active' and c.status='active' order by mem.joined_at desc limit 1
  ), completed as (
    select distinct on(a.assignment_id) a.assignment_id,m.category,m.estimated_minutes from public.attempts a join public.mission_versions mv on mv.id=a.mission_version_id join public.missions m on m.id=mv.mission_id join membership mem on mem.class_id=a.class_id
    where a.participant_id=auth.uid() and a.status='completed' order by a.assignment_id,a.completed_at desc
  ), evidence as (
    select count(*) missions,count(distinct category) categories,array_agg(distinct category order by category) competencies,
      greatest(1,round(sum(estimated_minutes)/60.0,1)) hours from completed
  ), retained as (select exists(select 1 from public.retention_checks r where r.participant_id=auth.uid() and r.answered_at is not null) value)
  select evidence.missions>=5 and evidence.categories>=3 and retained.value,evidence.missions,evidence.categories,retained.value,cert.id,cert.verification_code,
    coalesce(cert.participant_name,p.display_name),coalesce(cert.class_name,membership.class_name),coalesce(cert.organization_name,s.organization_name),coalesce(cert.signer_name,s.signer_name),coalesce(cert.signer_title,s.signer_title),
    coalesce(cert.competencies,evidence.competencies),coalesce(cert.estimated_hours,evidence.hours),cert.issued_at
  from membership cross join evidence cross join retained join public.profiles p on p.id=auth.uid() cross join public.certificate_settings s
  left join public.participation_certificates cert on cert.participant_id=auth.uid() and cert.class_id=membership.class_id and cert.revoked_at is null;
$$;

create or replace function public.issue_my_participation_certificate(requested_id uuid,requested_code uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare status record; selected_class uuid;
begin
  select * into status from public.get_my_certificate_status();
  if status is null or not status.eligible then raise exception 'CERTIFICATE_NOT_ELIGIBLE' using errcode='42501'; end if;
  select mem.class_id into selected_class from public.memberships mem join public.classes c on c.id=mem.class_id where mem.user_id=auth.uid() and mem.role='participant' and mem.status='active' and c.status='active' order by mem.joined_at desc limit 1;
  insert into public.participation_certificates(id,verification_code,participant_id,class_id,participant_name,class_name,organization_name,signer_name,signer_title,completed_missions,competencies,estimated_hours)
  values(requested_id,requested_code,auth.uid(),selected_class,status.participant_name,status.class_name,status.organization_name,status.signer_name,status.signer_title,status.completed_missions,status.competencies,status.estimated_hours)
  on conflict(participant_id,class_id) do update set completed_missions=excluded.completed_missions,competencies=excluded.competencies,estimated_hours=excluded.estimated_hours
  returning verification_code into requested_code;
  return requested_code;
end $$;

create or replace function public.verify_participation_certificate(selected_code uuid)
returns table(valid boolean,participant_name text,class_name text,organization_name text,signer_name text,signer_title text,completed_missions integer,competencies text[],estimated_hours numeric,issued_at timestamptz)
language sql stable security definer set search_path='' as $$
  select cert.revoked_at is null,cert.participant_name,cert.class_name,cert.organization_name,cert.signer_name,cert.signer_title,cert.completed_missions,cert.competencies,cert.estimated_hours,cert.issued_at
  from public.participation_certificates cert where cert.verification_code=selected_code;
$$;

create or replace function public.submit_mission_quality_feedback(requested_id uuid,target_attempt_id uuid,helpful_rating smallint,clarity_rating smallint,selected_issues text[])
returns uuid language plpgsql security definer set search_path='' as $$
declare target public.attempts;
begin
  select * into target from public.attempts a where a.id=target_attempt_id and a.participant_id=auth.uid() and a.status='completed';
  if target is null or helpful_rating not between 1 and 5 or clarity_rating not between 1 and 5 or not selected_issues <@ array['text_difficult','audio_difficult','step_unclear','too_long','technical_problem','none']::text[] or ('none'=any(selected_issues) and cardinality(selected_issues)>1) then raise exception 'INVALID_MISSION_FEEDBACK' using errcode='22023'; end if;
  insert into public.mission_quality_feedback(id,attempt_id,participant_id,class_id,assignment_id,helpful,clarity,issue_codes)
  values(requested_id,target.id,auth.uid(),target.class_id,target.assignment_id,helpful_rating,clarity_rating,selected_issues) on conflict(attempt_id) do nothing;
  return requested_id;
end $$;

create or replace function public.get_admin_mission_feedback_summary(target_class_id uuid default null)
returns table(response_count bigint,average_helpful numeric,average_clarity numeric,text_difficult bigint,audio_difficult bigint,step_unclear bigint,too_long bigint,technical_problem bigint)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_global_admin() then raise exception 'ADMIN_ACCESS_REQUIRED' using errcode='42501'; end if;
  return query select count(*),round(avg(f.helpful),2),round(avg(f.clarity),2),count(*) filter(where 'text_difficult'=any(f.issue_codes)),count(*) filter(where 'audio_difficult'=any(f.issue_codes)),count(*) filter(where 'step_unclear'=any(f.issue_codes)),count(*) filter(where 'too_long'=any(f.issue_codes)),count(*) filter(where 'technical_problem'=any(f.issue_codes)) from public.mission_quality_feedback f where target_class_id is null or f.class_id=target_class_id;
end $$;

revoke all on function public.update_certificate_settings(text,text,text),public.get_my_certificate_status(),public.issue_my_participation_certificate(uuid,uuid),public.verify_participation_certificate(uuid),public.submit_mission_quality_feedback(uuid,uuid,smallint,smallint,text[]),public.get_admin_mission_feedback_summary(uuid) from public;
grant execute on function public.update_certificate_settings(text,text,text),public.get_my_certificate_status(),public.issue_my_participation_certificate(uuid,uuid),public.submit_mission_quality_feedback(uuid,uuid,smallint,smallint,text[]),public.get_admin_mission_feedback_summary(uuid) to authenticated;
grant execute on function public.verify_participation_certificate(uuid) to anon,authenticated;

commit;
