-- CCF Centris — production catch-up (2026-10-06).
--
-- The live site's database missed migrations 0012–0017 (they were pushed to a
-- different Supabase project). This brings any CCF Centris database up to date.
-- Every statement is safe to run more than once: it skips what already exists.
-- Paste it all into Supabase → SQL Editor → Run.

-- 0012 room requests
alter table reservations
  add column if not exists request_group uuid,
  add column if not exists equipment jsonb not null default '{}'::jsonb,
  add column if not exists food text;
create index if not exists reservations_request_group_idx on reservations (request_group);

-- 0013 day-before reminders
alter table dgroup_table_bookings add column if not exists reminder_sent_at timestamptz;
alter table reservations add column if not exists reminder_sent_at timestamptz;

-- 0014 Prayer Wall: I prayed, topics, answered
create table if not exists prayer_wall_prayers (
  post_id    uuid not null references prayer_wall_posts(id) on delete cascade,
  member_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);
create index if not exists prayer_wall_prayers_member_id_idx on prayer_wall_prayers (member_id);
alter table prayer_wall_prayers enable row level security;
revoke all on prayer_wall_prayers from anon, authenticated;
grant select, insert, update, delete on prayer_wall_prayers to service_role;
alter table prayer_wall_posts
  add column if not exists topic text check (topic in ('health', 'family', 'work', 'guidance', 'thanks', 'other')),
  add column if not exists answered_at timestamptz;

-- 0015 Dgroup table blocks
create table if not exists dgroup_table_blocks (
  id            uuid primary key default gen_random_uuid(),
  satellite_id  uuid not null references satellites(id) on delete cascade,
  room_slug     text not null,
  table_label   text,
  booked_on     date not null,
  slot_id       text,
  reason        text check (reason is null or char_length(reason) <= 200),
  created_at    timestamptz not null default now()
);
create index if not exists dgroup_table_blocks_satellite_id_booked_on_idx on dgroup_table_blocks (satellite_id, booked_on);
alter table dgroup_table_blocks enable row level security;
revoke all on dgroup_table_blocks from anon, authenticated;
grant select, insert, update, delete on dgroup_table_blocks to service_role;

create or replace function dgroup_tables_blocked(
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

-- 0016 announcements
alter type event_status add value if not exists 'pending';
alter type event_status add value if not exists 'changes_requested';
alter type event_status add value if not exists 'declined';
alter table events
  add column if not exists submitted_by     uuid references profiles(id) on delete set null,
  add column if not exists ministry         text check (ministry is null or char_length(ministry) <= 80),
  add column if not exists registration_url text check (registration_url is null or registration_url ~ '^https?://'),
  add column if not exists fee_note         text check (fee_note is null or char_length(fee_note) <= 120),
  add column if not exists review_note      text check (review_note is null or char_length(review_note) <= 500),
  add column if not exists reviewed_at      timestamptz,
  add column if not exists updated_at       timestamptz not null default now(),
  add column if not exists artwork          jsonb not null default '{}'::jsonb;
create table if not exists event_dates (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz,
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists event_dates_event_id_starts_at_idx on event_dates (event_id, starts_at);
create table if not exists announcement_reps (
  id           uuid primary key default gen_random_uuid(),
  satellite_id uuid not null references satellites(id) on delete cascade,
  email        text not null check (char_length(email) between 3 and 254),
  name         text check (name is null or char_length(name) <= 120),
  ministry     text check (ministry is null or char_length(ministry) <= 80),
  requested_at timestamptz not null default now(),
  approved_at  timestamptz
);
create unique index if not exists announcement_reps_one_per_email on announcement_reps (satellite_id, lower(email));
alter table event_dates enable row level security;
alter table announcement_reps enable row level security;
revoke all on event_dates, announcement_reps from anon, authenticated;
grant select, insert, update, delete on event_dates, announcement_reps to service_role;
drop policy if exists events_public_read on events;
create policy events_public_read on events for select using (status::text in ('published', 'completed'));

-- 0017 all-day dates, calendar-only events
alter table event_dates add column if not exists all_day boolean not null default false;
alter table events add column if not exists calendar_only boolean not null default false;

-- Tell the database API about the new tables and columns.
notify pgrst, 'reload schema';
