create table if not exists public.ai_generation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 10),
  primary key (user_id, window_started_at)
);

alter table public.ai_generation_usage enable row level security;
revoke all on public.ai_generation_usage from anon, authenticated;

create or replace function public.consume_ai_generation_quota()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  current_window timestamptz := date_trunc('hour', clock_timestamp());
  accepted_count integer;
begin
  if caller is null then return false; end if;
  insert into public.ai_generation_usage(user_id, window_started_at, request_count)
  values (caller, current_window, 1)
  on conflict (user_id, window_started_at) do update
    set request_count = ai_generation_usage.request_count + 1
    where ai_generation_usage.request_count < 10
  returning request_count into accepted_count;
  return accepted_count is not null;
end;
$$;

revoke all on function public.consume_ai_generation_quota() from public, anon;
grant execute on function public.consume_ai_generation_quota() to authenticated;

comment on table public.ai_generation_usage is 'Contadores técnicos por usuário; não armazena consulta nem conteúdo gerado.';
