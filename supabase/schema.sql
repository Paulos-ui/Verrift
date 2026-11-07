-- Run once in Supabase SQL Editor, not in the browser.
-- Application records are server-managed. Clients have no direct table privileges.
create table if not exists public.verrift_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.verrift_state enable row level security;
revoke all on public.verrift_state from anon, authenticated;
grant select, insert, update on public.verrift_state to service_role;
-- Only server secret/service role can call the atomic compare-and-swap function.
create or replace function public.verrift_cas_state(expected_revision text, next_state jsonb)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare previous_revision text;
begin
  insert into public.verrift_state(id,state) values('main',next_state)
  on conflict do nothing;
  -- Initial insertion: if no row was present, the payload has already been written.
  -- For existing rows the revision must match and the update must happen atomically.
  select state->>'revision' into previous_revision
    from public.verrift_state where id='main' for update;
  if previous_revision = next_state->>'revision' then
    return true;
  end if;
  if previous_revision is distinct from expected_revision then
    return false;
  end if;
  update public.verrift_state set state=next_state, updated_at=now() where id='main';
  return true;
end;
$$;
revoke all on function public.verrift_cas_state(text,jsonb) from public, anon, authenticated;
grant execute on function public.verrift_cas_state(text,jsonb) to service_role;
