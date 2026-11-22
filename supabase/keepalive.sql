-- Keepalive table, for the scheduled ping in
-- .github/workflows/supabase-keepalive.yml
--
-- Supabase pauses Free plan projects after 7 days of low activity, and a
-- paused project has to be restored by hand. While the site has few signed in
-- readers there may genuinely be no traffic for a week, so a scheduled job
-- reads this one row every day to keep the project awake.
--
-- Why a table of its own rather than reading `progress`: anonymous access to
-- `progress` is deliberately revoked, and a keepalive job is a bad reason to
-- undo that. This table holds one meaningless row and is readable by anyone,
-- which costs nothing because there is nothing in it.
--
-- Run this once in the SQL editor, the same way as schema.sql. Safe to repeat.

create table if not exists public.keepalive (
  id       smallint primary key default 1,
  noted_at timestamptz not null default now(),
  -- one row, forever: the primary key plus this check make a second row
  -- impossible rather than merely unlikely
  constraint keepalive_single_row check (id = 1)
);

insert into public.keepalive (id) values (1) on conflict (id) do nothing;

alter table public.keepalive enable row level security;

-- Readable by anyone, writable by nobody. There are no insert, update or
-- delete policies, so RLS denies all three to every client, including a
-- signed in one.
drop policy if exists keepalive_readable on public.keepalive;
create policy keepalive_readable on public.keepalive
  for select using (true);

grant usage on schema public to anon;
grant select on public.keepalive to anon;
revoke insert, update, delete on public.keepalive from anon, authenticated;
