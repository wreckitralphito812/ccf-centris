-- CCF Centris — Adrian's events and trainings for October–November 2026.
--
-- Run AFTER 2026-10-06-production-catchup.sql. Safe to run more than once
-- (fixed ids; anything already there is skipped). Edit or add posters later in
-- Admin → Announcements → Live → Edit.
--
-- Times are Manila. Where Adrian gave no time, the date is "all day" until the
-- ministry confirms. Sign-up links: only GLC's was given; add the others via
-- Edit when the ministries send them.

with sat as (
  select coalesce(
    (select id from satellites where slug = 'centris' limit 1),
    '00000000-0000-0000-0000-0000000ce471'::uuid
  ) as id
),
ev (id, slug, title, summary, description, category, venue, ministry, starts_at, ends_at, registration_url, fee_note, calendar_only) as (
  values
  ('e0000001-0000-4000-8000-000000000001'::uuid, 'love-triangle-2026-10-16', 'Love Triangle',
   'A weekend for couples to rewind and reignite their love, and rediscover the designer of marriage.',
   'The perfect opportunity for couples to rewind and reignite their passion not only for each other, but most especially to review and rediscover the creator and designer of marriage: our Heavenly Father.',
   'Events', 'CCF Centris', 'CCF Centris', '2026-10-16 00:00+08'::timestamptz, '2026-10-18 23:59+08'::timestamptz, null, null, false),

  ('e0000001-0000-4000-8000-000000000002'::uuid, 'in-his-presence-2026-10-17', 'In His Presence',
   'An intimate evening of worship and praise. Come with open hearts and let your praise overflow!',
   'We are inviting everyone to BE "In His Presence"! Join us on October 17 at 7 PM at the CCF Center for an intimate evening of worship and praise as we come together and encounter God in His presence. Let''s come with open hearts and let our praise overflow!',
   'Events', 'CCF Centris', 'Friends', '2026-10-17 19:00+08'::timestamptz, null, null, null, false),

  ('e0000001-0000-4000-8000-000000000003'::uuid, 'mid-autumn-dice-game-2026-10-24', 'Mid-Autumn Dice Game',
   'Roll the dice, win prizes and make new friends. Open to all ages: bring your family and friends!',
   'CCF Filchi ministry is inviting everyone to join our Mid-Autumn Dice Game! This is open to all people of all ages! Bring all your family and friends and get ready to roll the dice, and win prizes and new friendships!',
   'Events', 'CCF Centris', 'Filchi', '2026-10-24 00:00+08'::timestamptz, '2026-10-24 23:59+08'::timestamptz, null, null, false),

  ('e0000001-0000-4000-8000-000000000004'::uuid, 'family-camp-lite-howme-2026-11-07', 'Family Camp Lite: H.O.W.M.E.',
   'A full day to play, connect, build friendships and grow closer to God and each other as a family.',
   'A full day to play, connect, build friendships, and to grow closer to God and each other as a family! But, if you''re single, you''re also invited, so bring your barkada / spiritual family with you and join us! Come for the fun and leave with memories that will last for eternity!',
   'Events', 'Main Hall', 'ACROSS', '2026-11-07 08:00+08'::timestamptz, '2026-11-07 17:00+08'::timestamptz, null,
   '₱600 adults and teens (13 and up), ₱400 kids (7–12), free for 6 and below', false),

  ('e0000001-0000-4000-8000-000000000005'::uuid, 'raised-around-jesus-2026-10-10', 'Raised Around Jesus',
   'A new series for ages 15 to 26: an afternoon of fellowship, faith-building and fun.',
   'Neighborhood will be starting a brand-new series entitled: Raised Around Jesus… But Do I Actually Know Him? So parents, if you have children between the ages of 15 to 26, make sure they come for an afternoon of fellowship, faith-building, and fun!',
   'Events', 'CCF Centris', 'The Neighborhood', '2026-10-10 15:30+08'::timestamptz, '2026-11-14 15:30+08'::timestamptz, null, null, false),

  ('e0000001-0000-4000-8000-000000000006'::uuid, 'stress-for-success-2026-10-21', 'Stress for Success',
   'Learn how to handle worry and stress the biblical way in this new GLC series.',
   'Learn how to handle worries and stress the biblical way! Join us as we start our new series on: STRESS FOR SUCCESS! Register below, and together, let us turn stress into success!',
   'Trainings and classes', 'CCF Centris', 'GLC', '2026-10-21 00:00+08'::timestamptz, '2026-11-11 23:59+08'::timestamptz,
   'https://docs.google.com/forms/d/e/1FAIpQLSfOLPXbcCggZTCvMRXl_g0vDdEFVSrwoU4vJ3SlYcQO9qifAg/viewform', null, false),

  ('e0000001-0000-4000-8000-000000000007'::uuid, 'true-life-retreat-2026-10-30', 'True Life Retreat',
   'Step away from the noise, reflect on your life and reconnect with God. Baptism follows on November 1.',
   'Join us for True Life Retreat this October 30 & 31 at CCF Centris, followed by Baptism on November 1 at St. Charbel Executive Village. This is more than just a retreat: it''s an opportunity to step away from the noise, reflect on your life, reconnect with God, and discover the true life that can only be found in Christ.',
   'Trainings and classes', 'CCF Centris', 'CCF Centris', '2026-10-30 00:00+08'::timestamptz, '2026-11-01 23:59+08'::timestamptz, null, null, false),

  -- Booked at Centris by other satellites and pastors: calendar only.
  ('e0000001-0000-4000-8000-000000000008'::uuid, 'focig-2026-11-11', 'FOCIG',
   'Booked at CCF Centris.', null, 'Events', 'CCF Centris', 'FOCIG',
   '2026-11-11 00:00+08'::timestamptz, '2026-11-11 23:59+08'::timestamptz, null, null, true),

  ('e0000001-0000-4000-8000-000000000009'::uuid, 'pastor-bong-saquing-pag-2026-11-18', 'Pastor Bong Saquing: PAG',
   'Booked at CCF Centris.', null, 'Events', 'CCF Centris', 'Pastor Bong Saquing',
   '2026-11-18 00:00+08'::timestamptz, '2026-11-18 23:59+08'::timestamptz, null, null, true),

  ('e0000001-0000-4000-8000-000000000010'::uuid, 'pastor-bong-saquing-unite-2026-11-27', 'Pastor Bong Saquing: Unite',
   'Booked at CCF Centris.', null, 'Events', 'CCF Centris', 'Pastor Bong Saquing',
   '2026-11-27 00:00+08'::timestamptz, '2026-11-28 23:59+08'::timestamptz, null, null, true)
)
insert into events (id, satellite_id, slug, title, summary, description, category, location_note, organizer, ministry,
                    starts_at, ends_at, registration_url, requires_registration, fee_note, calendar_only, status, reviewed_at)
select ev.id, sat.id, ev.slug, ev.title, ev.summary, ev.description, ev.category, ev.venue, ev.ministry, ev.ministry,
       ev.starts_at, ev.ends_at, ev.registration_url, ev.registration_url is not null, ev.fee_note, ev.calendar_only,
       'published', now()
from ev, sat
on conflict (id) do nothing;

insert into event_dates (id, event_id, starts_at, ends_at, all_day)
values
  ('d0000001-0000-4000-8000-000000000101', 'e0000001-0000-4000-8000-000000000001', '2026-10-16 00:00+08', '2026-10-18 23:59+08', true),
  ('d0000001-0000-4000-8000-000000000201', 'e0000001-0000-4000-8000-000000000002', '2026-10-17 19:00+08', null, false),
  ('d0000001-0000-4000-8000-000000000301', 'e0000001-0000-4000-8000-000000000003', '2026-10-24 00:00+08', '2026-10-24 23:59+08', true),
  ('d0000001-0000-4000-8000-000000000401', 'e0000001-0000-4000-8000-000000000004', '2026-11-07 08:00+08', '2026-11-07 17:00+08', false),
  ('d0000001-0000-4000-8000-000000000501', 'e0000001-0000-4000-8000-000000000005', '2026-10-10 15:30+08', null, false),
  ('d0000001-0000-4000-8000-000000000502', 'e0000001-0000-4000-8000-000000000005', '2026-11-07 15:30+08', null, false),
  ('d0000001-0000-4000-8000-000000000503', 'e0000001-0000-4000-8000-000000000005', '2026-11-14 15:30+08', null, false),
  ('d0000001-0000-4000-8000-000000000601', 'e0000001-0000-4000-8000-000000000006', '2026-10-21 00:00+08', '2026-10-21 23:59+08', true),
  ('d0000001-0000-4000-8000-000000000602', 'e0000001-0000-4000-8000-000000000006', '2026-10-28 00:00+08', '2026-10-28 23:59+08', true),
  ('d0000001-0000-4000-8000-000000000603', 'e0000001-0000-4000-8000-000000000006', '2026-11-04 00:00+08', '2026-11-04 23:59+08', true),
  ('d0000001-0000-4000-8000-000000000604', 'e0000001-0000-4000-8000-000000000006', '2026-11-11 00:00+08', '2026-11-11 23:59+08', true),
  ('d0000001-0000-4000-8000-000000000701', 'e0000001-0000-4000-8000-000000000007', '2026-10-30 00:00+08', '2026-11-01 23:59+08', true),
  ('d0000001-0000-4000-8000-000000000801', 'e0000001-0000-4000-8000-000000000008', '2026-11-11 00:00+08', '2026-11-11 23:59+08', true),
  ('d0000001-0000-4000-8000-000000000901', 'e0000001-0000-4000-8000-000000000009', '2026-11-18 00:00+08', '2026-11-18 23:59+08', true),
  ('d0000001-0000-4000-8000-000000001001', 'e0000001-0000-4000-8000-000000000010', '2026-11-27 00:00+08', '2026-11-28 23:59+08', true)
on conflict (id) do nothing;
