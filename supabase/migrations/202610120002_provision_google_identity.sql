begin;

create or replace function public.provision_verified_google_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  public_class_id constant uuid := 'c5100000-0000-4000-8000-000000000001';
  verified_email boolean;
begin
  if new.provider <> 'google' then
    return new;
  end if;

  select auth_user.email_confirmed_at is not null
  into verified_email
  from auth.users auth_user
  where auth_user.id = new.user_id;

  if not coalesce(verified_email, false) then
    return new;
  end if;

  update public.profiles
  set account_status = 'active'
  where id = new.user_id
    and account_status = 'pending';

  if exists (
    select 1 from public.profiles
    where id = new.user_id and account_status = 'active'
  ) then
    insert into public.memberships (class_id, user_id, role, status)
    values (public_class_id, new.user_id, 'participant', 'active')
    on conflict on constraint memberships_one_role_per_class_user_key do update set
      status = 'active',
      ended_at = null,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_csm_google_identity_created on auth.identities;
create trigger on_csm_google_identity_created
  after insert or update of identity_data on auth.identities
  for each row
  when (new.provider = 'google')
  execute function public.provision_verified_google_identity();

-- Corrige contas Google existentes que foram criadas antes do gatilho acima.
update public.profiles profile
set account_status = 'active'
from auth.users auth_user
where profile.id = auth_user.id
  and profile.account_status = 'pending'
  and auth_user.email_confirmed_at is not null
  and exists (
    select 1 from auth.identities identity
    where identity.user_id = auth_user.id and identity.provider = 'google'
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
  and exists (
    select 1 from auth.identities identity
    where identity.user_id = auth_user.id and identity.provider = 'google'
  )
on conflict on constraint memberships_one_role_per_class_user_key do update set
  status = 'active',
  ended_at = null,
  updated_at = now();

revoke all on function public.provision_verified_google_identity() from public;
grant execute on function public.provision_verified_google_identity() to service_role;

commit;
