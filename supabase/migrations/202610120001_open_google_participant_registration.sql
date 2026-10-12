begin;

-- Turma de entrada para pessoas que acessam publicamente com Google.
insert into public.classes (id, name, slug, shift, status, created_by)
values (
  'c5100000-0000-4000-8000-000000000001',
  'Comunidade Celular Sem Medo',
  'comunidade-celular-sem-medo',
  'Acesso livre',
  'active',
  null
)
on conflict (id) do update set
  name = excluded.name,
  shift = excluded.shift,
  status = 'active';

-- Todo Google verificado nasce como aluno. Outros provedores continuam
-- pendentes e o papel administrativo segue exclusivamente server-side.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  derived_name text;
  derived_avatar text;
  is_verified_google boolean;
  public_class_id constant uuid := 'c5100000-0000-4000-8000-000000000001';
begin
  derived_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Pessoa usuária'
  );
  derived_avatar := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'avatar_url'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'picture'), '')
  );
  is_verified_google := new.email_confirmed_at is not null and (
    new.raw_app_meta_data ->> 'provider' = 'google'
    or coalesce(new.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
  );

  insert into public.profiles (id, display_name, avatar_url, account_status)
  values (
    new.id,
    left(derived_name, 120),
    left(derived_avatar, 2048),
    case when is_verified_google then 'active'::public.account_status else 'pending'::public.account_status end
  )
  on conflict (id) do nothing;

  insert into public.preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if is_verified_google then
    insert into public.memberships (class_id, user_id, role, status)
    values (public_class_id, new.id, 'participant', 'active')
    on conflict on constraint memberships_one_role_per_class_user_key do update set
      status = 'active',
      ended_at = null,
      updated_at = now();
  end if;

  return new;
end;
$$;

-- Regulariza somente contas Google verificadas que já tentaram entrar. Não
-- reativa contas bloqueadas e não altera concessões administrativas.
update public.profiles profile
set account_status = 'active'
from auth.users auth_user
where profile.id = auth_user.id
  and profile.account_status = 'pending'
  and auth_user.email_confirmed_at is not null
  and (
    auth_user.raw_app_meta_data ->> 'provider' = 'google'
    or coalesce(auth_user.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
  );

insert into public.memberships (class_id, user_id, role, status)
select
  'c5100000-0000-4000-8000-000000000001',
  profile.id,
  'participant'::public.app_role,
  'active'::public.membership_status
from public.profiles profile
join auth.users auth_user on auth_user.id = profile.id
where profile.account_status = 'active'
  and auth_user.email_confirmed_at is not null
  and (
    auth_user.raw_app_meta_data ->> 'provider' = 'google'
    or coalesce(auth_user.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
  )
on conflict on constraint memberships_one_role_per_class_user_key do update set
  status = 'active',
  ended_at = null,
  updated_at = now();

revoke all on function public.handle_new_auth_user() from public;
grant execute on function public.handle_new_auth_user() to service_role;

commit;
