-- CCF Centris — Dgroup table bookings.
--
-- A Dgroup leader books a table for a night and time slot; the site assigns
-- the table. Which rooms, tables, nights and slots exist is configuration in
-- src/lib/dgroup-tables.ts (placeholders for now), so a booking records the
-- room and table it landed on by name rather than by foreign key.
--
-- Members never write here directly: the server action validates against that
-- configuration and inserts with the service role. Members can read their own
-- bookings; Dgroup and facilities staff can read them all.

create table dgroup_table_bookings (
  id              uuid primary key default gen_random_uuid(),
  satellite_id    uuid not null references satellites(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  room_slug       text not null,
  table_label     text not null,
  table_seats     int not null check (table_seats > 0),
  booked_on       date not null,
  slot_id         text not null,
  leader_name     text not null check (char_length(btrim(leader_name)) between 2 and 120),
  contact_mobile  text not null check (char_length(btrim(contact_mobile)) between 7 and 30),
  group_size      int not null check (group_size between 1 and 30),
  agreed_rules_at timestamptz not null,
  status          text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at      timestamptz not null default now(),
  cancelled_at    timestamptz,
  check (group_size <= table_seats)
);

-- One confirmed group per table per slot. The server tries tables best fit
-- first and moves to the next when this rejects an insert, so two leaders
-- booking at the same moment can never land on the same table.
create unique index dgroup_table_bookings_one_per_table
  on dgroup_table_bookings (satellite_id, room_slug, table_label, booked_on, slot_id)
  where status = 'confirmed';

-- One table per member per slot.
create unique index dgroup_table_bookings_one_per_member
  on dgroup_table_bookings (satellite_id, user_id, booked_on, slot_id)
  where status = 'confirmed';

create index on dgroup_table_bookings (satellite_id, booked_on);

alter table dgroup_table_bookings enable row level security;

revoke all on dgroup_table_bookings from anon;
revoke insert, update, delete on dgroup_table_bookings from authenticated;

create policy dgroup_table_bookings_read on dgroup_table_bookings
  for select to authenticated
  using (
    user_id = auth.uid()
    or has_role(satellite_id, array['dgroup_admin', 'facilities_admin', 'satellite_admin']::app_role[])
  );
