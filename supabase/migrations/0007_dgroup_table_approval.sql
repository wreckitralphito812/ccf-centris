-- CCF Centris — Dgroup table bookings become approval-gated.
--
-- Booking a table used to confirm instantly. CCF Centris wants a request to
-- sit for approval first, and only then to tell the leader their table
-- number.
--
-- A pending request HOLDS its table. The alternative — assigning at approval
-- time — lets two pending requests compete for the last table that fits, and
-- the loser only finds out when an admin tries to approve it. Holding on
-- submit makes double-booking structurally impossible: the unique indexes
-- below simply refuse the second insert, and the server walks on to the next
-- best table. Declining or cancelling frees the table again.

alter table dgroup_table_bookings
  drop constraint dgroup_table_bookings_status_check;

alter table dgroup_table_bookings
  add constraint dgroup_table_bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'declined'));

-- New requests arrive unapproved.
alter table dgroup_table_bookings alter column status set default 'pending';

alter table dgroup_table_bookings
  add column decided_at     timestamptz,
  add column decline_reason text;

-- The holds. Both indexes now count a pending request as occupying the table,
-- not just a confirmed one.
drop index dgroup_table_bookings_one_per_table;
create unique index dgroup_table_bookings_one_per_table
  on dgroup_table_bookings (satellite_id, room_slug, table_label, booked_on, slot_id)
  where status in ('pending', 'confirmed');

drop index dgroup_table_bookings_one_per_member;
create unique index dgroup_table_bookings_one_per_member
  on dgroup_table_bookings (satellite_id, user_id, booked_on, slot_id)
  where status in ('pending', 'confirmed');

-- Anything already booked under the old instant-confirm flow stays confirmed;
-- nothing to backfill. New rows default to pending from here.
