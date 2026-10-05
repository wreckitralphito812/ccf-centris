-- CCF Centris — announcements for What's Happening (2026-10-05).
--
-- Approved ministry reps submit an announcement (artwork in five screen sizes
-- plus the key facts typed out); an admin approves it; it goes live on What's
-- Happening and comes down after its last date. Spec:
-- docs/superpowers/specs/2026-10-05-announcements-design.md.
--
-- Submissions live in `events` with new statuses; series dates in
-- `event_dates`; who may submit in `announcement_reps`. The site writes all of
-- it with the service role. The public read policy on events now hides
-- anything not yet published.

alter type event_status add value if not exists 'pending';
alter type event_status add value if not exists 'changes_requested';
alter type event_status add value if not exists 'declined';

alter table events
  add column submitted_by     uuid references profiles(id) on delete set null,
  add column ministry         text check (ministry is null or char_length(ministry) <= 80),
  add column registration_url text check (registration_url is null or registration_url ~ '^https?://'),
  add column fee_note         text check (fee_note is null or char_length(fee_note) <= 120),
  add column review_note      text check (review_note is null or char_length(review_note) <= 500),
  add column reviewed_at      timestamptz,
  add column updated_at       timestamptz not null default now(),
  -- Uploaded artwork, keyed by placement: main_tv, gallery_tv, led, standee, social.
  add column artwork          jsonb not null default '{}'::jsonb;

-- Every date of an announcement (one row for a single event, several for a
-- series). events.starts_at / ends_at keep the first start and last end.
create table event_dates (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz,
  check (ends_at is null or ends_at > starts_at)
);
create index on event_dates (event_id, starts_at);

-- Who may submit. A row with approved_at null is an access request.
create table announcement_reps (
  id           uuid primary key default gen_random_uuid(),
  satellite_id uuid not null references satellites(id) on delete cascade,
  email        text not null check (char_length(email) between 3 and 254),
  name         text check (name is null or char_length(name) <= 120),
  ministry     text check (ministry is null or char_length(ministry) <= 80),
  requested_at timestamptz not null default now(),
  approved_at  timestamptz
);
create unique index announcement_reps_one_per_email on announcement_reps (satellite_id, lower(email));

alter table event_dates enable row level security;
alter table announcement_reps enable row level security;
revoke all on event_dates, announcement_reps from anon, authenticated;
grant select, insert, update, delete on event_dates, announcement_reps to service_role;

-- Only published (and finished) events are public; submissions under review are not.
drop policy if exists events_public_read on events;
create policy events_public_read on events
  for select using (status::text in ('published', 'completed'));
