-- CCF Centris — auto-provision a profile row when someone signs up.
--
-- `profiles` mirrors `auth.users` (see 0001_core.sql). Without this trigger a
-- freshly signed-up user has no profile row, so any RLS policy or join that
-- reads `profiles` for them returns nothing. The handler runs as the definer
-- so it can insert past `profiles` RLS.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile email in step if the auth email changes.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email, updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;

create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Let a signed-in user create their own profile row too, so a client-side
-- upsert is a valid fallback if the trigger is ever disabled.
create policy profiles_self_insert on public.profiles
  for insert with check (id = auth.uid());
