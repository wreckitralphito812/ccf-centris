-- CCF Centris — screen names and the Prayer Wall.
--
-- The Prayer Wall is members-only: reading needs an account as well as
-- posting, because requests often carry health and family details. Everything
-- on it shows a screen name, never a real name or an email address. Requests
-- expire two months after posting and drop out of view on their own.
--
-- Enforcement lives here, not in the app. Members use their own session, so
-- these policies are what stand between a request and anyone who shouldn't
-- see it.

-- ---------------------------------------------------------------------------
-- Screen names
-- ---------------------------------------------------------------------------

alter table profiles
  add column screen_name text
  constraint profiles_screen_name_format
    check (screen_name ~ '^[[:alnum:]][[:alnum:] ._-]{1,22}[[:alnum:]]$');

-- Unique regardless of case, so "Ralph" and "ralph" can't both exist.
create unique index profiles_screen_name_unique
  on profiles (lower(screen_name))
  where screen_name is not null;

-- Set the caller's own screen name, and nothing else on their profile.
create or replace function public.set_screen_name(new_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text := btrim(regexp_replace(coalesce(new_name, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then
    raise exception 'sign in to choose a screen name' using errcode = '28000';
  end if;
  update profiles set screen_name = cleaned, updated_at = now()
  where id = auth.uid();
  if not found then
    raise exception 'no profile for this account' using errcode = 'P0002';
  end if;
  return cleaned;
end;
$$;

-- The caller's own screen name, or null.
create or replace function public.my_screen_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select screen_name from profiles where id = auth.uid();
$$;

revoke all on function public.set_screen_name(text) from public, anon;
revoke all on function public.my_screen_name() from public, anon;
grant execute on function public.set_screen_name(text) to authenticated;
grant execute on function public.my_screen_name() to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table prayer_wall_posts (
  id            uuid primary key default gen_random_uuid(),
  satellite_id  uuid not null references satellites(id) on delete cascade,
  author_id     uuid not null references profiles(id) on delete cascade,
  -- The author's screen name, stamped by trigger. Stored here so members can
  -- see who posted without being able to read anyone's profile.
  author_name   text not null,
  body          text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '2 months'),
  hidden_at     timestamptz,
  hidden_by     uuid references profiles(id) on delete set null
);

create index on prayer_wall_posts (satellite_id, created_at desc);

create type prayer_reply_kind as enum ('prayer', 'message');

-- A prayer prayed for the request, or a message left for its author.
create table prayer_wall_replies (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references prayer_wall_posts(id) on delete cascade,
  satellite_id  uuid not null references satellites(id) on delete cascade,
  author_id     uuid not null references profiles(id) on delete cascade,
  author_name   text not null,
  kind          prayer_reply_kind not null,
  body          text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at    timestamptz not null default now(),
  hidden_at     timestamptz,
  hidden_by     uuid references profiles(id) on delete set null
);

create index on prayer_wall_replies (post_id, created_at);

create table prayer_wall_reports (
  id            uuid primary key default gen_random_uuid(),
  satellite_id  uuid not null references satellites(id) on delete cascade,
  post_id       uuid references prayer_wall_posts(id) on delete cascade,
  reply_id      uuid references prayer_wall_replies(id) on delete cascade,
  reporter_id   uuid not null references profiles(id) on delete cascade,
  reason        text check (char_length(reason) <= 500),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  check (num_nonnulls(post_id, reply_id) = 1)
);

-- One report per member per item.
create unique index prayer_wall_reports_once_per_post
  on prayer_wall_reports (reporter_id, post_id) where post_id is not null;
create unique index prayer_wall_reports_once_per_reply
  on prayer_wall_reports (reporter_id, reply_id) where reply_id is not null;

-- ---------------------------------------------------------------------------
-- Triggers: the server decides names, dates, and moderation state
-- ---------------------------------------------------------------------------

-- Whatever the client sends, a new post carries the author's current screen
-- name, starts now, expires in two months, and starts visible.
create or replace function public.prayer_wall_before_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.author_name := (select screen_name from profiles where id = new.author_id);
  if new.author_name is null then
    raise exception 'choose a screen name before posting' using errcode = 'P0001';
  end if;
  new.created_at := now();
  new.expires_at := now() + interval '2 months';
  new.hidden_at := null;
  new.hidden_by := null;
  return new;
end;
$$;

create trigger prayer_wall_before_post
  before insert on prayer_wall_posts
  for each row execute function public.prayer_wall_before_post();

-- Replies only land on a request that is still open, inherit its satellite,
-- and carry the author's screen name.
create or replace function public.prayer_wall_before_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent prayer_wall_posts%rowtype;
begin
  select * into parent from prayer_wall_posts where id = new.post_id;
  if parent.id is null or parent.hidden_at is not null or parent.expires_at <= now() then
    raise exception 'that prayer request is no longer open' using errcode = 'P0001';
  end if;
  new.satellite_id := parent.satellite_id;
  new.author_name := (select screen_name from profiles where id = new.author_id);
  if new.author_name is null then
    raise exception 'choose a screen name before posting' using errcode = 'P0001';
  end if;
  new.created_at := now();
  new.hidden_at := null;
  new.hidden_by := null;
  return new;
end;
$$;

create trigger prayer_wall_before_reply
  before insert on prayer_wall_replies
  for each row execute function public.prayer_wall_before_reply();

create or replace function public.prayer_wall_before_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.satellite_id := coalesce(
    (select satellite_id from prayer_wall_posts where id = new.post_id),
    (select satellite_id from prayer_wall_replies where id = new.reply_id)
  );
  if new.satellite_id is null then
    raise exception 'nothing to report' using errcode = 'P0002';
  end if;
  new.created_at := now();
  new.resolved_at := null;
  return new;
end;
$$;

create trigger prayer_wall_before_report
  before insert on prayer_wall_reports
  for each row execute function public.prayer_wall_before_report();

-- Three open reports from different members hide an item until a moderator
-- looks at it, so the wall looks after itself between moderator visits.
create or replace function public.prayer_wall_after_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.post_id is not null and (
    select count(*) from prayer_wall_reports
    where post_id = new.post_id and resolved_at is null
  ) >= 3 then
    update prayer_wall_posts set hidden_at = coalesce(hidden_at, now())
    where id = new.post_id;
  end if;
  if new.reply_id is not null and (
    select count(*) from prayer_wall_reports
    where reply_id = new.reply_id and resolved_at is null
  ) >= 3 then
    update prayer_wall_replies set hidden_at = coalesce(hidden_at, now())
    where id = new.reply_id;
  end if;
  return null;
end;
$$;

create trigger prayer_wall_after_report
  after insert on prayer_wall_reports
  for each row execute function public.prayer_wall_after_report();

-- A renamed member keeps their history under the new name.
create or replace function public.prayer_wall_follow_rename()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.screen_name is not null and new.screen_name is distinct from old.screen_name then
    update prayer_wall_posts set author_name = new.screen_name where author_id = new.id;
    update prayer_wall_replies set author_name = new.screen_name where author_id = new.id;
  end if;
  return new;
end;
$$;

create trigger prayer_wall_follow_rename
  after update of screen_name on profiles
  for each row execute function public.prayer_wall_follow_rename();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table prayer_wall_posts enable row level security;
alter table prayer_wall_replies enable row level security;
alter table prayer_wall_reports enable row level security;

-- Visitors who aren't signed in get nothing at all.
revoke all on prayer_wall_posts, prayer_wall_replies, prayer_wall_reports from anon;

-- Members can't edit what they posted (no quietly changing a request after
-- people have prayed for it). The only columns anyone updates are the
-- moderation ones, and the policies below limit that to moderators.
revoke update on prayer_wall_posts, prayer_wall_replies, prayer_wall_reports from authenticated;
grant update (hidden_at, hidden_by) on prayer_wall_posts, prayer_wall_replies to authenticated;
grant update (resolved_at) on prayer_wall_reports to authenticated;

-- Posts: members see open requests; authors also see their own, hidden or
-- expired; moderators see everything.
create policy prayer_wall_posts_read on prayer_wall_posts
  for select to authenticated
  using (
    (hidden_at is null and expires_at > now())
    or author_id = auth.uid()
    or has_role(satellite_id, array['prayer_team', 'satellite_admin']::app_role[])
  );

create policy prayer_wall_posts_insert on prayer_wall_posts
  for insert to authenticated
  with check (author_id = auth.uid());

create policy prayer_wall_posts_moderate on prayer_wall_posts
  for update to authenticated
  using (has_role(satellite_id, array['prayer_team', 'satellite_admin']::app_role[]))
  with check (has_role(satellite_id, array['prayer_team', 'satellite_admin']::app_role[]));

create policy prayer_wall_posts_author_delete on prayer_wall_posts
  for delete to authenticated
  using (author_id = auth.uid());

-- Replies: visible when their request is visible to you and the reply isn't
-- hidden (or it's yours, or you moderate).
create policy prayer_wall_replies_read on prayer_wall_replies
  for select to authenticated
  using (
    exists (select 1 from prayer_wall_posts p where p.id = post_id)
    and (
      hidden_at is null
      or author_id = auth.uid()
      or has_role(satellite_id, array['prayer_team', 'satellite_admin']::app_role[])
    )
  );

create policy prayer_wall_replies_insert on prayer_wall_replies
  for insert to authenticated
  with check (author_id = auth.uid());

create policy prayer_wall_replies_moderate on prayer_wall_replies
  for update to authenticated
  using (has_role(satellite_id, array['prayer_team', 'satellite_admin']::app_role[]))
  with check (has_role(satellite_id, array['prayer_team', 'satellite_admin']::app_role[]));

create policy prayer_wall_replies_author_delete on prayer_wall_replies
  for delete to authenticated
  using (author_id = auth.uid());

-- Reports: any member can file one; only moderators read or resolve them.
create policy prayer_wall_reports_insert on prayer_wall_reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

create policy prayer_wall_reports_moderator_read on prayer_wall_reports
  for select to authenticated
  using (has_role(satellite_id, array['prayer_team', 'satellite_admin']::app_role[]));

create policy prayer_wall_reports_moderate on prayer_wall_reports
  for update to authenticated
  using (has_role(satellite_id, array['prayer_team', 'satellite_admin']::app_role[]))
  with check (has_role(satellite_id, array['prayer_team', 'satellite_admin']::app_role[]));

-- ---------------------------------------------------------------------------
-- Retention
-- ---------------------------------------------------------------------------

-- Expired requests leave the wall at two months. This deletes them outright a
-- month after that, replies and reports included, so sensitive details aren't
-- kept longer than they're useful. Run it on a schedule with the service role.
create or replace function public.purge_expired_prayer_wall(older_than interval default interval '30 days')
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from prayer_wall_posts where expires_at < now() - older_than returning 1
  )
  select count(*)::int from gone;
$$;

revoke all on function public.purge_expired_prayer_wall(interval) from public, anon, authenticated;
grant execute on function public.purge_expired_prayer_wall(interval) to service_role;
