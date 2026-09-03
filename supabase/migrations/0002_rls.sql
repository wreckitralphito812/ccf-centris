-- CCF Centris — row level security
--
-- Principle: public content is readable by anyone. Anything naming a person
-- is readable only by that person or by the specific staff role that handles it.
-- Care requests are the tightest: pastoral and prayer staff only, never the
-- general admin roles.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function has_role(target_satellite uuid, wanted app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = any(wanted)
      and (
        ur.role = 'super_admin'
        or ur.satellite_id is null
        or ur.satellite_id = target_satellite
      )
  );
$$;

create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from user_roles where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Public content: readable by all, written by staff
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'satellites', 'venues', 'speakers', 'series', 'services', 'messages',
    'four_ws', 'communities', 'ministries', 'glc_programs', 'glc_classes',
    'events', 'facilities', 'courts', 'reservation_addons', 'volunteer_roles',
    'announcements', 'faqs', 'resources', 'facility_blackouts'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for select using (true)',
      t || '_public_read', t
    );
  end loop;
end $$;

-- Dgroups are publicly discoverable but only through a safe view.
alter table dgroups enable row level security;

create policy dgroups_public_read on dgroups
  for select using (is_open = true);

-- Never expose leader identity or area precision to anonymous browsers.
create view dgroups_public as
  select
    d.id, d.satellite_id, d.community_id, d.name, d.general_area,
    d.audience, d.mode, d.language, d.age_min, d.age_max,
    d.day_of_week, d.start_time, d.description, d.is_open,
    case when d.capacity is null then null
         else greatest(d.capacity - d.current_size, 0) end as seats_left,
    coalesce(p.preferred_name, split_part(p.full_name, ' ', 1)) as leader_first_name
  from dgroups d
  left join profiles p on p.id = d.leader_id
  where d.is_open;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;

create policy profiles_self_read on profiles
  for select using (id = auth.uid());

create policy profiles_self_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_staff_read on profiles
  for select using (is_staff());

alter table user_roles enable row level security;

create policy user_roles_self_read on user_roles
  for select using (user_id = auth.uid());

create policy user_roles_admin_all on user_roles
  for all using (has_role(satellite_id, array['super_admin', 'satellite_admin']::app_role[]));

-- ---------------------------------------------------------------------------
-- Dgroup membership and inquiries
-- ---------------------------------------------------------------------------

alter table dgroup_members enable row level security;

-- You see your own membership, and leaders see their group's roster.
create policy dgroup_members_read on dgroup_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from dgroup_members me
      where me.dgroup_id = dgroup_members.dgroup_id
        and me.user_id = auth.uid()
        and me.is_leader
    )
  );

alter table dgroup_inquiries enable row level security;

-- Anyone may submit interest. Only the Dgroup team may read them.
create policy dgroup_inquiries_insert on dgroup_inquiries
  for insert with check (true);

create policy dgroup_inquiries_staff_read on dgroup_inquiries
  for select using (
    has_role(satellite_id, array['super_admin', 'satellite_admin', 'dgroup_admin', 'ministry_leader']::app_role[])
  );

create policy dgroup_inquiries_staff_update on dgroup_inquiries
  for update using (
    has_role(satellite_id, array['super_admin', 'satellite_admin', 'dgroup_admin']::app_role[])
  );

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

alter table event_registrations enable row level security;

create policy event_registrations_insert on event_registrations
  for insert with check (true);

create policy event_registrations_self_read on event_registrations
  for select using (user_id = auth.uid());

create policy event_registrations_staff_read on event_registrations
  for select using (
    exists (
      select 1 from events e
      where e.id = event_registrations.event_id
        and has_role(e.satellite_id, array['super_admin', 'satellite_admin', 'events_admin']::app_role[])
    )
  );

-- ---------------------------------------------------------------------------
-- Reservations
-- ---------------------------------------------------------------------------

alter table reservations enable row level security;

create policy reservations_insert on reservations
  for insert with check (true);

create policy reservations_self_read on reservations
  for select using (user_id = auth.uid());

create policy reservations_staff_read on reservations
  for select using (
    has_role(satellite_id, array['super_admin', 'satellite_admin', 'facilities_admin', 'sports_admin']::app_role[])
  );

create policy reservations_staff_write on reservations
  for update using (
    has_role(satellite_id, array['super_admin', 'satellite_admin', 'facilities_admin', 'sports_admin']::app_role[])
  );

create policy reservations_self_cancel on reservations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table reservation_addon_items enable row level security;

create policy reservation_addon_items_read on reservation_addon_items
  for select using (
    exists (
      select 1 from reservations r
      where r.id = reservation_addon_items.reservation_id
        and (r.user_id = auth.uid()
             or has_role(r.satellite_id, array['super_admin', 'satellite_admin', 'facilities_admin', 'sports_admin']::app_role[]))
    )
  );

create policy reservation_addon_items_insert on reservation_addon_items
  for insert with check (true);

alter table reservation_waitlist enable row level security;

create policy reservation_waitlist_insert on reservation_waitlist
  for insert with check (true);

create policy reservation_waitlist_self_read on reservation_waitlist
  for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Serving
-- ---------------------------------------------------------------------------

alter table volunteer_applications enable row level security;

create policy volunteer_applications_insert on volunteer_applications
  for insert with check (true);

create policy volunteer_applications_self_read on volunteer_applications
  for select using (user_id = auth.uid());

create policy volunteer_applications_staff_read on volunteer_applications
  for select using (
    exists (
      select 1 from volunteer_roles vr
      where vr.id = volunteer_applications.role_id
        and has_role(vr.satellite_id, array['super_admin', 'satellite_admin', 'volunteer_admin', 'ministry_leader']::app_role[])
    )
  );

alter table volunteer_assignments enable row level security;

create policy volunteer_assignments_self on volunteer_assignments
  for select using (user_id = auth.uid());

create policy volunteer_assignments_self_confirm on volunteer_assignments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- GLC
-- ---------------------------------------------------------------------------

alter table glc_registrations enable row level security;

create policy glc_registrations_self on glc_registrations
  for select using (user_id = auth.uid());

create policy glc_registrations_insert on glc_registrations
  for insert with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Care. No general admin role reaches these tables.
-- ---------------------------------------------------------------------------

alter table prayer_requests enable row level security;

-- Anyone may ask for prayer, including anonymously and while signed out.
create policy prayer_requests_insert on prayer_requests
  for insert with check (true);

-- A signed-in requester may see their own, unless they chose anonymity.
create policy prayer_requests_self_read on prayer_requests
  for select using (user_id = auth.uid() and not is_anonymous);

create policy prayer_requests_team_read on prayer_requests
  for select using (
    has_role(satellite_id, array['super_admin', 'prayer_team', 'pastoral_care']::app_role[])
  );

create policy prayer_requests_team_update on prayer_requests
  for update using (
    has_role(satellite_id, array['super_admin', 'prayer_team', 'pastoral_care']::app_role[])
  );

alter table pastoral_requests enable row level security;

create policy pastoral_requests_insert on pastoral_requests
  for insert with check (true);

create policy pastoral_requests_self_read on pastoral_requests
  for select using (user_id = auth.uid());

create policy pastoral_requests_team_read on pastoral_requests
  for select using (
    has_role(satellite_id, array['super_admin', 'pastoral_care']::app_role[])
  );

create policy pastoral_requests_team_update on pastoral_requests
  for update using (
    has_role(satellite_id, array['super_admin', 'pastoral_care']::app_role[])
  );

-- ---------------------------------------------------------------------------
-- Personal preferences
-- ---------------------------------------------------------------------------

alter table saved_messages enable row level security;

create policy saved_messages_self on saved_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table notification_preferences enable row level security;

create policy notification_preferences_self on notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
