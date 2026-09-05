-- CCF Centris — carry a phone number into the profile on first signup.
--
-- The sign-in form has an optional Phone field; `sendMagicLink` passes it as
-- `mobile` in the user's metadata. Extend `handle_new_user` (see 0003) to read
-- it into `profiles.mobile` (column already exists, 0001_core.sql).
--
-- Only the function body changes — the `on_auth_user_created` trigger and the
-- email-change function/trigger from 0003 stay as they are. `on conflict do
-- nothing` still means this runs for the first signup of an email only.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, mobile)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'mobile', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
