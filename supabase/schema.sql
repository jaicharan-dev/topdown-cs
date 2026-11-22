-- Progress sync for TopDown CS.
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New
-- query -> paste -> Run). It is written to be safe to run more than once.
--
-- The design is deliberately boring: one row per user holding the same JSON
-- blob the browser already keeps in localStorage. No per-page rows, no schema
-- that has to change when a doc is added or renamed, and nothing that needs a
-- server of our own. The browser talks to Supabase directly, and row level
-- security is the only thing standing between one user's data and another's,
-- which is why every policy below is scoped to auth.uid().

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Without this line the anon key in the browser bundle would let anyone read
-- everyone's rows. RLS denies everything by default, and the policies below
-- open up exactly one row per user.
alter table public.progress enable row level security;

drop policy if exists progress_select_own on public.progress;
create policy progress_select_own on public.progress
  for select using (auth.uid() = user_id);

drop policy if exists progress_insert_own on public.progress;
create policy progress_insert_own on public.progress
  for insert with check (auth.uid() = user_id);

-- `using` decides which rows may be updated, `with check` decides what they
-- may be updated TO. Both are needed: without the second, a user could hand
-- their row to somebody else by changing user_id.
drop policy if exists progress_update_own on public.progress;
create policy progress_update_own on public.progress
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- People are entitled to delete their own data.
drop policy if exists progress_delete_own on public.progress;
create policy progress_delete_own on public.progress
  for delete using (auth.uid() = user_id);

-- Table level permissions.
--
-- Row level security decides WHICH ROWS a role may touch. It does not grant
-- the role access to the table in the first place, and those are separate
-- gates: without the grant below, every query fails with a permission error
-- however correct the policies are.
--
-- Supabase can hand this out automatically for new tables, but that is a
-- dashboard setting that can be switched off later by someone who has no idea
-- it is load bearing. Stating it here means this file alone is enough to make
-- the feature work.
--
-- Only `authenticated` is granted anything. The site never reads this table
-- without a session, so the anonymous role has no business reaching it, and
-- revoking leaves two independent barriers rather than relying on RLS alone.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.progress to authenticated;
revoke all on public.progress from anon;


-- Keep updated_at honest rather than trusting the client to send it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists progress_touch_updated_at on public.progress;
create trigger progress_touch_updated_at
  before update on public.progress
  for each row execute function public.touch_updated_at();


-- OPTIONAL, and safe to skip.
--
-- A signed in user can write whatever JSON they like into their own row. A
-- full history is a few tens of kilobytes, so a megabyte ceiling is generous
-- while still stopping anyone parking a large file in the table. The client
-- refuses to upload anything larger too, but that check lives in code the
-- user controls, so this is the one that counts.
--
-- If your Postgres rejects this constraint, just leave it out: everything
-- above still works.
do $$
begin
  alter table public.progress
    add constraint progress_data_size
    check (octet_length(data::text) < 1048576);
exception
  when duplicate_object then null;
  when others then
    raise notice 'Skipped the optional size constraint: %', sqlerrm;
end;
$$;
