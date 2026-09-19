-- CCF Centris — Dgroup table bookings for the October 2026 launch.
--
-- Three changes from 0006/0007:
--
-- 1. Instant confirmation. CCF Centris dropped the admin approval step: a
--    booking is final once the leader accepts the policies. New rows default to
--    'confirmed', and anything still pending is confirmed as it stands.
--
-- 2. Joined tables. A big group can be seated at two or three neighbouring
--    tables, so one booking can hold several tables. Each held table is a row in
--    dgroup_table_holds, and a unique index there is what keeps two groups off
--    the same table: the second insert is refused and the server moves on to the
--    next best tables. A booking row keeps its first table in table_label (for
--    older readers) and the full list in table_labels.
--
-- 3. The leader's email, for the confirmation and change emails.
--
-- Booking and changing go through two functions so that a booking and its
-- holds are written together or not at all. Only the server (service role)
-- calls them; members never write these tables directly.

alter table dgroup_table_bookings
  add column leader_email text check (leader_email is null or char_length(leader_email) between 3 and 200),
  add column table_labels text[],
  add column changed_at   timestamptz;

update dgroup_table_bookings set table_labels = array[table_label] where table_labels is null;
alter table dgroup_table_bookings alter column table_labels set not null;

update dgroup_table_bookings
  set status = 'confirmed', decided_at = coalesce(decided_at, now())
  where status = 'pending';
alter table dgroup_table_bookings alter column status set default 'confirmed';

-- The holds replace the per-booking table index, which could only see one
-- table per booking.
drop index dgroup_table_bookings_one_per_table;

create table dgroup_table_holds (
  booking_id   uuid not null references dgroup_table_bookings(id) on delete cascade,
  satellite_id uuid not null references satellites(id) on delete cascade,
  room_slug    text not null,
  table_label  text not null,
  booked_on    date not null,
  slot_id      text not null
);

create unique index dgroup_table_holds_one_per_table
  on dgroup_table_holds (satellite_id, room_slug, table_label, booked_on, slot_id);
create index on dgroup_table_holds (booking_id);

insert into dgroup_table_holds (booking_id, satellite_id, room_slug, table_label, booked_on, slot_id)
  select id, satellite_id, room_slug, table_label, booked_on, slot_id
  from dgroup_table_bookings
  where status in ('pending', 'confirmed');

alter table dgroup_table_holds enable row level security;
revoke all on dgroup_table_holds from anon, authenticated;

-- Cancelling or declining a booking frees its tables, whoever does it.
create function dgroup_release_holds() returns trigger
language plpgsql as $$
begin
  if new.status not in ('pending', 'confirmed') then
    delete from dgroup_table_holds where booking_id = new.id;
  end if;
  return new;
end $$;

create trigger dgroup_table_bookings_release
  after update of status on dgroup_table_bookings
  for each row execute function dgroup_release_holds();

-- Book a set of tables. Raises unique_violation (23505) naming
-- dgroup_table_holds_one_per_table if any table was taken a moment ago, or
-- dgroup_table_bookings_one_per_member if this member already has a booking for
-- that day and slot. Either way nothing is written.
create function book_dgroup_tables(
  p_satellite uuid, p_user uuid, p_room text, p_labels text[], p_seats int,
  p_date date, p_slot text, p_name text, p_mobile text, p_email text, p_size int
) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  insert into dgroup_table_bookings
    (satellite_id, user_id, room_slug, table_label, table_labels, table_seats, booked_on,
     slot_id, leader_name, contact_mobile, leader_email, group_size, agreed_rules_at,
     status, decided_at)
  values
    (p_satellite, p_user, p_room, p_labels[1], p_labels, p_seats, p_date,
     p_slot, p_name, p_mobile, p_email, p_size, now(), 'confirmed', now())
  returning id into v_id;

  insert into dgroup_table_holds (booking_id, satellite_id, room_slug, table_label, booked_on, slot_id)
    select v_id, p_satellite, p_room, l, p_date, p_slot from unnest(p_labels) as l;

  return v_id;
end $$;

-- Move a member's booking to a new day, slot, headcount and tables. Its old
-- tables are released and the new ones held in the same step, so on failure
-- (23505, as above) the booking keeps exactly what it had.
create function move_dgroup_booking(
  p_id uuid, p_user uuid, p_room text, p_labels text[], p_seats int,
  p_date date, p_slot text, p_size int
) returns void
language plpgsql as $$
declare
  v_satellite uuid;
begin
  select satellite_id into v_satellite
    from dgroup_table_bookings
    where id = p_id and user_id = p_user and status = 'confirmed'
    for update;
  if v_satellite is null then
    raise exception 'booking not found' using errcode = 'P0002';
  end if;

  delete from dgroup_table_holds where booking_id = p_id;

  update dgroup_table_bookings
    set room_slug = p_room, table_label = p_labels[1], table_labels = p_labels,
        table_seats = p_seats, booked_on = p_date, slot_id = p_slot,
        group_size = p_size, changed_at = now()
    where id = p_id;

  insert into dgroup_table_holds (booking_id, satellite_id, room_slug, table_label, booked_on, slot_id)
    select p_id, v_satellite, p_room, l, p_date, p_slot from unnest(p_labels) as l;
end $$;

revoke all on function book_dgroup_tables(uuid, uuid, text, text[], int, date, text, text, text, text, int) from public, anon, authenticated;
revoke all on function move_dgroup_booking(uuid, uuid, text, text[], int, date, text, int) from public, anon, authenticated;
grant execute on function book_dgroup_tables(uuid, uuid, text, text[], int, date, text, text, text, text, int) to service_role;
grant execute on function move_dgroup_booking(uuid, uuid, text, text[], int, date, text, int) to service_role;
