-- CCF Centris — member sign-in moves from Supabase Auth to Firebase Auth.
--
-- Firebase proves who a member is; the site's server checks that proof and
-- then reads and writes Postgres with the service role, naming the member
-- explicitly. So nothing here depends on `auth.users` or `auth.uid()` any more:
--
-- 1. `profiles` stops mirroring `auth.users`. A profile now has its own id and
--    carries the Firebase uid it belongs to.
-- 2. The signup triggers on `auth.users` go; the server provisions profiles
--    through `link_firebase_member` instead.
-- 3. The member-facing functions that read `auth.uid()` (`set_screen_name`,
--    `my_screen_name`, `set_my_name`) go; the server updates the member's own
--    row directly.
--
-- The row-level security policies stay. No member session reaches the
-- database now, so they no longer decide anything for members, but they still
-- shut out anyone holding the anon key.

-- ---------------------------------------------------------------------------
-- Profiles: own ids, keyed to a Firebase uid
-- ---------------------------------------------------------------------------

do $$
declare c text;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.profiles'::regclass
      and con.contype = 'f'
      and con.confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.profiles drop constraint %I', c);
  end loop;
end;
$$;

alter table profiles alter column id set default gen_random_uuid();

alter table profiles
  add column firebase_uid text unique
    check (firebase_uid is null or char_length(firebase_uid) between 1 and 128);

-- Members are found by email the first time they sign in with Firebase.
create index profiles_email_lower on profiles (lower(email));

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_email_change on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.handle_user_email_change();

drop function if exists public.set_screen_name(text);
drop function if exists public.my_screen_name();
drop function if exists public.set_my_name(text, text);

-- ---------------------------------------------------------------------------
-- Provisioning
-- ---------------------------------------------------------------------------

-- The profile for a Firebase account, found or created. Called by the server
-- only after it has verified the Firebase ID token, and only with an email
-- Firebase has verified:
--
--   1. A profile already holding this uid is theirs.
--   2. Otherwise a profile with the same email is theirs. This is how members
--      who signed up under Supabase Auth keep their bookings and posts: owning
--      the inbox is what owning the account always meant here.
--   3. Otherwise they are new, and get a fresh profile.
--
-- Names, avatar and phone only fill gaps; they never overwrite what a member
-- has already confirmed.
create or replace function public.link_firebase_member(
  p_uid       text,
  p_email     text,
  p_full_name text default null,
  p_first     text default null,
  p_last      text default null,
  p_avatar    text default null,
  p_mobile    text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_full   text := nullif(left(btrim(coalesce(p_full_name, '')), 200), '');
  v_first  text := nullif(left(btrim(coalesce(p_first, '')), 60), '');
  v_last   text := nullif(left(btrim(coalesce(p_last, '')), 60), '');
  v_avatar text := nullif(btrim(coalesce(p_avatar, '')), '');
  v_mobile text := nullif(left(btrim(coalesce(p_mobile, '')), 40), '');
  v_id     uuid;
begin
  if coalesce(btrim(p_uid), '') = '' or v_email = '' then
    raise exception 'a Firebase uid and a verified email are required' using errcode = '22023';
  end if;

  select id into v_id from profiles where firebase_uid = p_uid;
  if found then
    update profiles set email = v_email, updated_at = now()
    where id = v_id and email is distinct from v_email;
    return v_id;
  end if;

  -- Two first sign-ins for one address at once must not make two profiles.
  perform pg_advisory_xact_lock(hashtext('link_firebase_member:' || v_email));

  select id into v_id
  from profiles
  where lower(email) = v_email
  order by (firebase_uid is null) desc, created_at
  limit 1;

  if found then
    update profiles set
      firebase_uid = p_uid,
      email        = v_email,
      full_name    = coalesce(full_name, v_full),
      first_name   = coalesce(first_name, v_first),
      last_name    = coalesce(last_name, v_last),
      avatar_url   = coalesce(avatar_url, v_avatar),
      mobile       = coalesce(mobile, v_mobile),
      updated_at   = now()
    where id = v_id;
    return v_id;
  end if;

  insert into profiles (firebase_uid, email, full_name, first_name, last_name, avatar_url, mobile)
  values (p_uid, v_email, v_full, v_first, v_last, v_avatar, v_mobile)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.link_firebase_member(text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.link_firebase_member(text, text, text, text, text, text, text)
  to service_role;
