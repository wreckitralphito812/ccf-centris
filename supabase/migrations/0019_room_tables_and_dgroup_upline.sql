-- Ralph's requests of 2026-10-10.
--
-- Room requests: with the "tables" set-up, a ministry says how many tables of
-- each kind it needs, e.g. {"square": 3, "large": 2}. The center owns 20
-- square, 20 medium and 40 large, shared by everyone booked at the same time;
-- the request form and its server action check what's left. A request for
-- several rooms (one request_group) carries the same counts on every row.
alter table reservations
  add column if not exists tables jsonb not null default '{}'::jsonb
    check (jsonb_typeof(tables) = 'object');

-- Dgroup registry: every leader names their own Dgroup leader (their
-- upline), whom the Centris team can call before approving. Older
-- registrations have none, so the columns stay nullable; the form requires them.
alter table dgroups
  add column if not exists upline_name text
    check (upline_name is null or char_length(btrim(upline_name)) between 2 and 120),
  add column if not exists upline_mobile text
    check (upline_mobile is null or char_length(btrim(upline_mobile)) between 7 and 30);
