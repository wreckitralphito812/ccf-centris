-- CCF Centris — members' real names, and the Watch replay library.
--
-- 1. Names. CCF Centris needs each member's email, first name and surname.
--    Email comes with the account (proven by the sign-in link, or by Google or
--    Facebook). The names are asked once, on the "finish setting up" step
--    after the first sign-in. Google hands us given and family names, so a
--    Google sign-up arrives with them already filled in; other providers give
--    one "name" string that can't be split reliably, so those members confirm
--    it themselves.
--
-- 2. watch_replays. Every Sunday replay the site finds on CCF Net is saved
--    here, because CCF Net's videos are unlisted and can't be found again on
--    YouTube once CCF Net moves on. Admins can pin a video to override what the
--    Watch page shows, fix a title, or hide one. Server-only: the site reads
--    and writes it with the service role.

alter table profiles
  add column first_name text check (first_name is null or char_length(btrim(first_name)) between 1 and 60),
  add column last_name  text check (last_name is null or char_length(btrim(last_name)) between 1 and 60);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, email, full_name, mobile, first_name, last_name, avatar_url)
  values (
    new.id,
    new.email,
    nullif(coalesce(meta ->> 'full_name', meta ->> 'name'), ''),
    nullif(meta ->> 'mobile', ''),
    nullif(btrim(meta ->> 'given_name'), ''),
    nullif(btrim(meta ->> 'family_name'), ''),
    nullif(coalesce(meta ->> 'avatar_url', meta ->> 'picture'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Set the signed-in member's own first name and surname.
create or replace function public.set_my_name(p_first text, p_last text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  f text := btrim(regexp_replace(coalesce(p_first, ''), '\s+', ' ', 'g'));
  l text := btrim(regexp_replace(coalesce(p_last, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '28000';
  end if;
  update profiles
    set first_name = f, last_name = l, full_name = f || ' ' || l, updated_at = now()
    where id = auth.uid();
  if not found then
    raise exception 'no profile for this account' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_my_name(text, text) from public, anon;
grant execute on function public.set_my_name(text, text) to authenticated;

-- The Watch replay library.
create table watch_replays (
  video_id      text primary key check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  title         text not null check (char_length(title) between 1 and 200),
  speaker       text check (speaker is null or char_length(speaker) <= 120),
  service_date  date,
  source        text not null default 'ccfnet' check (source in ('ccfnet', 'manual')),
  hidden        boolean not null default false,
  pinned        boolean not null default false,
  first_seen_at timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- At most one pinned video.
create unique index watch_replays_one_pinned on watch_replays (pinned) where pinned;
create index on watch_replays (service_date desc);

alter table watch_replays enable row level security;
revoke all on watch_replays from anon, authenticated;
