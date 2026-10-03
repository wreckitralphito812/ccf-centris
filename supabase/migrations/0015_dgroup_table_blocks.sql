-- CCF Centris — admins can block Dgroup tables (2026-10-03).
--
-- A block takes tables out of booking for a day: one table, every table in a
-- room (table_label null), for one slot or the whole day (slot_id null), with
-- a reason for staff. Members simply see those tables as taken.
--
-- Room blocks need nothing new: they are facility_blackouts (0001_core.sql).
--
-- The booking functions check blocks inside the same transaction as the holds,
-- and raise 23505 like a taken table, so the site's existing retry moves on to
-- the next set of tables and two clicks at the same moment can't slip past a
-- block. Server-only, like the rest of the booking tables.

create table dgroup_table_blocks (
  id            uuid primary key default gen_random_uuid(),
  satellite_id  uuid not null references satellites(id) on delete cascade,
  room_slug     text not null,
  table_label   text,
  booked_on     date not null,
  slot_id       text,
  reason        text check (reason is null or char_length(reason) <= 200),
  created_at    timestamptz not null default now()
);

create index on dgroup_table_blocks (satellite_id, booked_on);

alter table dgroup_table_blocks enable row level security;
revoke all on dgroup_table_blocks from anon, authenticated;
grant select, insert, update, delete on dgroup_table_blocks to service_role;

create function dgroup_tables_blocked(
  p_satellite uuid, p_room text, p_labels text[], p_date date, p_slot text
) returns boolean
language sql stable as $$
  select exists (
    select 1 from dgroup_table_blocks b
    where b.satellite_id = p_satellite
      and b.room_slug = p_room
      and b.booked_on = p_date
      and (b.slot_id is null or b.slot_id = p_slot)
      and (b.table_label is null or b.table_label = any (p_labels))
  )
$$;

revoke all on function dgroup_tables_blocked(uuid, text, text[], date, text) from public, anon, authenticated;
grant execute on function dgroup_tables_blocked(uuid, text, text[], date, text) to service_role;

-- Same signatures and bodies as 0008, plus the block check first.
create or replace function book_dgroup_tables(
  p_satellite uuid, p_user uuid, p_room text, p_labels text[], p_seats int,
  p_date date, p_slot text, p_name text, p_mobile text, p_email text, p_size int
) returns uuid
language plpgsql as $$
declare
  v_id uuid;
begin
  if dgroup_tables_blocked(p_satellite, p_room, p_labels, p_date, p_slot) then
    raise exception 'tables blocked (dgroup_table_blocks)' using errcode = '23505';
  end if;

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

create or replace function move_dgroup_booking(
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

  if dgroup_tables_blocked(v_satellite, p_room, p_labels, p_date, p_slot) then
    raise exception 'tables blocked (dgroup_table_blocks)' using errcode = '23505';
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
