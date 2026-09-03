-- CCF Centris — core schema
-- Multi-satellite from day one. Every scoped table carries satellite_id.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ---------------------------------------------------------------------------
-- Satellites
-- ---------------------------------------------------------------------------

create table satellites (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  short_name    text,
  address_lines text[] not null default '{}',
  city          text,
  latitude      double precision,
  longitude     double precision,
  timezone      text not null default 'Asia/Manila',
  is_active     boolean not null default true,
  opened_on     date,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create type app_role as enum (
  'super_admin',
  'satellite_admin',
  'communications',
  'service_admin',
  'ministry_leader',
  'dgroup_admin',
  'events_admin',
  'facilities_admin',
  'sports_admin',
  'volunteer_admin',
  'pastoral_care',
  'prayer_team',
  'member'
);

-- Mirrors auth.users. Public-safe profile fields only.
create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  home_satellite_id  uuid references satellites(id) on delete set null,
  full_name          text,
  preferred_name     text,
  email              text,
  mobile             text,
  avatar_url         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Roles are per-satellite. A ministry leader at Centris is not one at Main.
create table user_roles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  satellite_id  uuid references satellites(id) on delete cascade,
  role          app_role not null,
  created_at    timestamptz not null default now(),
  unique (user_id, satellite_id, role)
);

create index on user_roles (user_id);

-- ---------------------------------------------------------------------------
-- Teaching: speakers, series, services, messages
-- ---------------------------------------------------------------------------

-- Shared CCF-wide, not satellite scoped.
create table speakers (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  role_title text,
  bio        text,
  photo_url  text
);

create table series (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  subtitle      text,
  description   text,
  artwork_url   text,
  starts_on     date,
  ends_on       date
);

create table venues (
  id            uuid primary key default gen_random_uuid(),
  satellite_id  uuid not null references satellites(id) on delete cascade,
  name          text not null,
  floor         text,
  capacity      int,
  unique (satellite_id, name)
);

create type service_status as enum ('scheduled', 'live', 'ended', 'cancelled');

create table services (
  id             uuid primary key default gen_random_uuid(),
  satellite_id   uuid not null references satellites(id) on delete cascade,
  venue_id       uuid references venues(id) on delete set null,
  series_id      uuid references series(id) on delete set null,
  speaker_id     uuid references speakers(id) on delete set null,
  title          text,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  status         service_status not null default 'scheduled',
  livestream_provider text default 'youtube',
  livestream_key      text,
  nxtgen_available    boolean not null default true,
  notes          text,
  created_at     timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index on services (satellite_id, starts_at);

create table messages (
  id             uuid primary key default gen_random_uuid(),
  satellite_id   uuid references satellites(id) on delete set null,
  service_id     uuid references services(id) on delete set null,
  series_id      uuid references series(id) on delete set null,
  speaker_id     uuid references speakers(id) on delete set null,
  slug           text not null unique,
  title          text not null,
  description    text,
  scripture      text,
  preached_on    date not null,
  duration_seconds int,
  thumbnail_url  text,
  full_video_key text,
  sermon_video_key text,
  audio_url      text,
  transcript     text,
  notes_md       text,
  topics         text[] not null default '{}',
  bible_books    text[] not null default '{}',
  is_published   boolean not null default true,
  created_at     timestamptz not null default now()
);

create index on messages (preached_on desc);
create index on messages using gin (topics);

-- CCF's weekly Dgroup discussion material.
create table four_ws (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid references messages(id) on delete cascade,
  title        text not null,
  week_of      date not null,
  welcome_md   text,
  worship_md   text,
  word_md      text,
  works_md     text,
  pdf_url      text,
  created_at   timestamptz not null default now()
);

create index on four_ws (week_of desc);

-- ---------------------------------------------------------------------------
-- Communities and ministries
-- ---------------------------------------------------------------------------

create table communities (
  id            uuid primary key default gen_random_uuid(),
  satellite_id  uuid not null references satellites(id) on delete cascade,
  slug          text not null,
  name          text not null,
  tagline       text,
  description   text,
  life_stage    text,
  hero_image_url text,
  accent        text,
  meeting_note  text,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  unique (satellite_id, slug)
);

create table ministries (
  id            uuid primary key default gen_random_uuid(),
  satellite_id  uuid not null references satellites(id) on delete cascade,
  community_id  uuid references communities(id) on delete set null,
  slug          text not null,
  name          text not null,
  description   text,
  unique (satellite_id, slug)
);

-- ---------------------------------------------------------------------------
-- Dgroups
-- ---------------------------------------------------------------------------

create type meeting_mode as enum ('in_person', 'online', 'hybrid');
create type dgroup_audience as enum (
  'men', 'women', 'couples', 'singles', 'students',
  'young_professionals', 'families', 'mixed'
);

create table dgroups (
  id             uuid primary key default gen_random_uuid(),
  satellite_id   uuid not null references satellites(id) on delete cascade,
  community_id   uuid references communities(id) on delete set null,
  leader_id      uuid references profiles(id) on delete set null,
  name           text not null,
  -- Deliberately coarse. Never a leader's home address.
  general_area   text,
  audience       dgroup_audience not null default 'mixed',
  mode           meeting_mode not null default 'in_person',
  language       text not null default 'English',
  age_min        int,
  age_max        int,
  day_of_week    int check (day_of_week between 0 and 6),
  start_time     time,
  description    text,
  capacity       int,
  current_size   int not null default 0,
  is_open        boolean not null default true,
  created_at     timestamptz not null default now()
);

create index on dgroups (satellite_id, is_open);

create type inquiry_status as enum ('new', 'contacted', 'joined', 'declined', 'closed');

create table dgroup_inquiries (
  id           uuid primary key default gen_random_uuid(),
  dgroup_id    uuid references dgroups(id) on delete set null,
  satellite_id uuid not null references satellites(id) on delete cascade,
  user_id      uuid references profiles(id) on delete set null,
  full_name    text not null,
  email        text not null,
  mobile       text,
  age_bracket  text,
  message      text,
  status       inquiry_status not null default 'new',
  created_at   timestamptz not null default now()
);

create table dgroup_members (
  id         uuid primary key default gen_random_uuid(),
  dgroup_id  uuid not null references dgroups(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  is_leader  boolean not null default false,
  joined_on  date not null default current_date,
  unique (dgroup_id, user_id)
);

-- ---------------------------------------------------------------------------
-- GLC
-- ---------------------------------------------------------------------------

create table glc_programs (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  code         text,
  title        text not null,
  description  text,
  level        int,
  sort_order   int not null default 0
);

create table glc_classes (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references glc_programs(id) on delete cascade,
  satellite_id  uuid not null references satellites(id) on delete cascade,
  venue_id      uuid references venues(id) on delete set null,
  starts_on     date not null,
  ends_on       date,
  schedule_note text,
  capacity      int,
  seats_taken   int not null default 0,
  is_open       boolean not null default true
);

create table glc_registrations (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references glc_classes(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  status     text not null default 'registered',
  created_at timestamptz not null default now(),
  unique (class_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create type event_status as enum ('draft', 'published', 'cancelled', 'completed');

create table events (
  id             uuid primary key default gen_random_uuid(),
  satellite_id   uuid not null references satellites(id) on delete cascade,
  community_id   uuid references communities(id) on delete set null,
  venue_id       uuid references venues(id) on delete set null,
  slug           text not null,
  title          text not null,
  summary        text,
  description    text,
  category       text,
  cover_image_url text,
  starts_at      timestamptz not null,
  ends_at        timestamptz,
  location_note  text,
  organizer      text,
  capacity       int,
  seats_taken    int not null default 0,
  requires_registration boolean not null default false,
  price_cents    int not null default 0,
  currency       text not null default 'PHP',
  requirements   text,
  status         event_status not null default 'published',
  created_at     timestamptz not null default now(),
  unique (satellite_id, slug)
);

create index on events (satellite_id, starts_at);

create type registration_status as enum ('confirmed', 'waitlisted', 'cancelled', 'checked_in');

create table event_registrations (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references events(id) on delete cascade,
  user_id      uuid references profiles(id) on delete set null,
  full_name    text not null,
  email        text not null,
  mobile       text,
  party_size   int not null default 1,
  status       registration_status not null default 'confirmed',
  ticket_code  text not null default encode(gen_random_bytes(6), 'hex'),
  created_at   timestamptz not null default now()
);

create index on event_registrations (event_id);

-- ---------------------------------------------------------------------------
-- Facilities and reservations
-- ---------------------------------------------------------------------------

create type facility_kind as enum (
  'worship_hall', 'sports_hall', 'court', 'multipurpose', 'lounge', 'welcome_center'
);

create table facilities (
  id             uuid primary key default gen_random_uuid(),
  satellite_id   uuid not null references satellites(id) on delete cascade,
  slug           text not null,
  name           text not null,
  kind           facility_kind not null,
  description    text,
  capacity       int,
  floor_area_sqm numeric,
  amenities      text[] not null default '{}',
  layouts        text[] not null default '{}',
  rules          text,
  accessibility  text,
  hero_image_url text,
  gallery        text[] not null default '{}',
  is_reservable  boolean not null default false,
  requires_approval boolean not null default true,
  hourly_rate_cents int,
  currency       text not null default 'PHP',
  open_time      time not null default '06:00',
  close_time     time not null default '22:00',
  sort_order     int not null default 0,
  unique (satellite_id, slug)
);

-- Individual playable courts inside a sports facility.
create table courts (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references facilities(id) on delete cascade,
  name         text not null,
  sport        text not null,
  is_active    boolean not null default true,
  sort_order   int not null default 0
);

create index on courts (facility_id);

create table reservation_addons (
  id           uuid primary key default gen_random_uuid(),
  satellite_id uuid not null references satellites(id) on delete cascade,
  slug         text not null,
  name         text not null,
  unit         text,
  price_cents  int not null default 0,
  is_active    boolean not null default true,
  unique (satellite_id, slug)
);

create type reservation_status as enum (
  'pending', 'approved', 'rejected', 'cancelled', 'completed'
);

create table reservations (
  id             uuid primary key default gen_random_uuid(),
  satellite_id   uuid not null references satellites(id) on delete cascade,
  facility_id    uuid references facilities(id) on delete set null,
  court_id       uuid references courts(id) on delete set null,
  user_id        uuid references profiles(id) on delete set null,
  -- Denormalised contact so a booking survives a deleted account.
  contact_name   text not null,
  contact_email  text not null,
  contact_mobile text,
  organization   text,
  purpose        text,
  activity_name  text,
  participants   int not null default 1,
  layout         text,
  during         tstzrange not null,
  setup_minutes  int not null default 0,
  teardown_minutes int not null default 0,
  status         reservation_status not null default 'pending',
  notes          text,
  internal_notes text,
  total_cents    int not null default 0,
  created_at     timestamptz not null default now()
);

-- The demo moment: the database itself refuses a double booking.
-- Only active reservations hold inventory.
alter table reservations
  add constraint reservations_no_court_overlap
  exclude using gist (
    court_id with =,
    during with &&
  ) where (court_id is not null and status in ('pending', 'approved'));

alter table reservations
  add constraint reservations_no_facility_overlap
  exclude using gist (
    facility_id with =,
    during with &&
  ) where (court_id is null and facility_id is not null and status in ('pending', 'approved'));

create index on reservations (satellite_id, status);

create table reservation_addon_items (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations(id) on delete cascade,
  addon_id       uuid not null references reservation_addons(id) on delete restrict,
  quantity       int not null default 1
);

-- Maintenance windows and closures block inventory without being bookings.
create table facility_blackouts (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid references facilities(id) on delete cascade,
  court_id     uuid references courts(id) on delete cascade,
  during       tstzrange not null,
  reason       text
);

create table reservation_waitlist (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid references facilities(id) on delete cascade,
  court_id     uuid references courts(id) on delete cascade,
  user_id      uuid references profiles(id) on delete set null,
  contact_email text not null,
  desired_date date not null,
  desired_window text,
  notified_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Serving
-- ---------------------------------------------------------------------------

create table volunteer_roles (
  id            uuid primary key default gen_random_uuid(),
  satellite_id  uuid not null references satellites(id) on delete cascade,
  ministry_id   uuid references ministries(id) on delete set null,
  slug          text not null,
  title         text not null,
  description   text,
  commitment    text,
  requirements  text,
  schedule_note text,
  training_note text,
  is_open       boolean not null default true,
  unique (satellite_id, slug)
);

create type application_status as enum ('submitted', 'reviewing', 'accepted', 'declined');

create table volunteer_applications (
  id            uuid primary key default gen_random_uuid(),
  role_id       uuid not null references volunteer_roles(id) on delete cascade,
  user_id       uuid references profiles(id) on delete set null,
  full_name     text not null,
  email         text not null,
  mobile        text,
  message       text,
  status        application_status not null default 'submitted',
  created_at    timestamptz not null default now()
);

create table volunteer_assignments (
  id           uuid primary key default gen_random_uuid(),
  role_id      uuid not null references volunteer_roles(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  service_id   uuid references services(id) on delete set null,
  event_id     uuid references events(id) on delete set null,
  serves_at    timestamptz not null,
  confirmed    boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Care. Highest sensitivity in the system.
-- ---------------------------------------------------------------------------

create type care_status as enum ('new', 'assigned', 'in_progress', 'closed');

create table prayer_requests (
  id            uuid primary key default gen_random_uuid(),
  satellite_id  uuid not null references satellites(id) on delete cascade,
  user_id       uuid references profiles(id) on delete set null,
  is_anonymous  boolean not null default false,
  full_name     text,
  email         text,
  mobile        text,
  category      text,
  body          text not null,
  wants_followup boolean not null default false,
  status        care_status not null default 'new',
  created_at    timestamptz not null default now()
);

create table pastoral_requests (
  id            uuid primary key default gen_random_uuid(),
  satellite_id  uuid not null references satellites(id) on delete cascade,
  user_id       uuid references profiles(id) on delete set null,
  kind          text not null,
  full_name     text,
  email         text,
  mobile        text,
  body          text,
  status        care_status not null default 'new',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Site content
-- ---------------------------------------------------------------------------

create type announcement_level as enum ('info', 'notice', 'urgent');

create table announcements (
  id            uuid primary key default gen_random_uuid(),
  satellite_id  uuid references satellites(id) on delete cascade,
  title         text not null,
  body          text,
  level         announcement_level not null default 'info',
  is_sitewide   boolean not null default false,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,
  link_href     text,
  link_label    text
);

create table faqs (
  id           uuid primary key default gen_random_uuid(),
  satellite_id uuid references satellites(id) on delete cascade,
  category     text not null default 'visit',
  question     text not null,
  answer       text not null,
  sort_order   int not null default 0
);

create table resources (
  id           uuid primary key default gen_random_uuid(),
  satellite_id uuid references satellites(id) on delete cascade,
  slug         text not null unique,
  title        text not null,
  description  text,
  kind         text,
  url          text,
  created_at   timestamptz not null default now()
);

create table saved_messages (
  user_id    uuid not null references profiles(id) on delete cascade,
  message_id uuid not null references messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

create table notification_preferences (
  user_id             uuid primary key references profiles(id) on delete cascade,
  service_reminders   boolean not null default true,
  event_reminders     boolean not null default true,
  reservation_updates boolean not null default true,
  dgroup_updates      boolean not null default true,
  volunteer_updates   boolean not null default true,
  glc_updates         boolean not null default true
);
