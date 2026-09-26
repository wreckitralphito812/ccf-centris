-- Ministry room requests, rebuilt from CCF Centris's Venue Reservation Form.
--
-- One request can take several rooms for a big event: each room is its own
-- reservation row (so the existing no-overlap constraint still guards every
-- room), and the rows share a request_group so they're approved together.
-- The ministry goes in `organization`, the set-up in `layout`, and any extra
-- notes in `purpose`, as before; equipment and food are new.

alter table reservations
  add column if not exists request_group uuid,
  add column if not exists equipment jsonb not null default '{}'::jsonb,
  add column if not exists food text;

create index if not exists reservations_request_group_idx on reservations (request_group);
