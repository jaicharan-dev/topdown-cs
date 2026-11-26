-- Unique usernames for TopDown CS.
--
-- Run this in the Supabase SQL editor the same way as schema.sql (Dashboard
-- -> SQL Editor -> New query -> paste -> Run). It is safe to run more than
-- once, and schema.sql does not depend on it: without this file the site
-- still works and usernames are simply unchecked.
--
-- The client cannot enforce uniqueness. It can only ask, and anything it asks
-- can be raced by a second browser answering the same question a millisecond
-- later. The real guarantee is the primary key below; the lookup function is
-- a courtesy so somebody is told before they press save rather than after.

create table if not exists public.usernames (
  -- The username IS the key. That is what makes it unique, and it is a
  -- promise the database keeps rather than one the application remembers to.
  username   text        primary key,
  -- One handle per account, hence the unique constraint rather than a plain
  -- reference. Changing a username moves the row.
  user_id    uuid        not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- The same shape the client validates, restated where it is enforceable.
  -- Lowercase only, so 'Jai' and 'jai' cannot both be taken.
  constraint usernames_shape check (username ~ '^[a-z0-9_-]{3,20}$')
);

alter table public.usernames enable row level security;

-- No policies, and no grants to anon or authenticated. Nothing reaches this
-- table directly at all: both operations below are security definer functions
-- that run as the owner.
--
-- That is deliberate. A readable usernames table is a directory of everyone
-- who has ever signed up, joined to their user id, and a study site has no
-- reason to publish one. Going through functions means a caller can ask "is
-- this taken" and "give me this one" and learn nothing else.
revoke all on public.usernames from anon, authenticated;


-- Is this username free for the caller to take?
--
-- Their own current handle counts as available, so re-saving a profile
-- without changing the username does not report it as taken.
create or replace function public.username_available(candidate text)
returns boolean
language sql
security definer
-- An empty search_path is not optional on a security definer function. Without
-- it, a caller who can create objects could put a table called `usernames` on
-- their own search path and have this run against theirs instead.
set search_path = ''
stable
as $$
  select not exists (
    select 1
    from public.usernames u
    where u.username = lower(trim(candidate))
      and u.user_id is distinct from auth.uid()
  );
$$;


-- Take a username, or release the one held.
--
-- Returns the username now held, or null when it was released. Raises
-- unique_violation when somebody else holds it, which is what the client
-- turns into "that one is taken".
create or replace function public.claim_username(candidate text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text := lower(trim(coalesce(candidate, '')));
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;

  -- An empty candidate releases the handle. Somebody who clears the field
  -- should stop holding the name, not keep it reserved forever.
  if wanted = '' then
    delete from public.usernames where user_id = auth.uid();
    return null;
  end if;

  if wanted !~ '^[a-z0-9_-]{3,20}$' then
    raise exception 'Invalid username' using errcode = '22023';
  end if;

  -- Already theirs: nothing to do, and nothing to fail on.
  if exists (
    select 1 from public.usernames
    where username = wanted and user_id = auth.uid()
  ) then
    return wanted;
  end if;

  delete from public.usernames where user_id = auth.uid();
  insert into public.usernames (username, user_id) values (wanted, auth.uid());
  return wanted;

-- The check above can be beaten by a second browser between the select and
-- the insert. This is the branch that actually decides it, and the only one
-- that cannot be raced.
exception
  when unique_violation then
    raise exception 'Username taken' using errcode = '23505';
end;
$$;

grant usage on schema public to authenticated;
grant execute on function public.username_available(text) to authenticated;
grant execute on function public.claim_username(text) to authenticated;

-- Not granted to anon. A signed out visitor has no account to attach a
-- username to, so there is nothing for them to ask and nothing to claim.
revoke all on function public.username_available(text) from anon;
revoke all on function public.claim_username(text) from anon;
