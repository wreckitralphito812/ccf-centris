-- CCF Centris — a more interactive Prayer Wall (2026-10-01).
--
-- Ralph found the wall boring: a list of text boxes. Three additions:
--   * "I prayed": one tap, one row per member per request, so each member
--     counts once and can tap again to take it back. No text needed.
--   * A topic on each request, so members can filter (health, family, ...).
--   * Answered prayers: the author marks a request answered, and the wall
--     shows it as a praise report.
--
-- Like the rest of the wall, the site writes these with the service role
-- (0010_firebase_auth.sql), which applies the rules in
-- src/app/actions/prayer-wall.ts. Nothing here is open to the anon key.

create table prayer_wall_prayers (
  post_id    uuid not null references prayer_wall_posts(id) on delete cascade,
  member_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, member_id)
);

create index on prayer_wall_prayers (member_id);

alter table prayer_wall_prayers enable row level security;
revoke all on prayer_wall_prayers from anon, authenticated;
grant select, insert, update, delete on prayer_wall_prayers to service_role;

alter table prayer_wall_posts
  add column topic text
    check (topic in ('health', 'family', 'work', 'guidance', 'thanks', 'other')),
  add column answered_at timestamptz;
