-- CCF Centris — all-day dates and calendar-only events (2026-10-06).
--
-- From Adrian's review: retreats run over several days (Love Triangle, Oct 16–18;
-- True Life Retreat, Oct 30 – Nov 1) and some dates have no times yet, so a
-- date can be all-day. And events booked at Centris by other satellites or
-- pastors (FOCIG, Pastor Bong Saquing) belong on the calendar without being
-- promoted on What's Happening: calendar_only.

alter table event_dates add column if not exists all_day boolean not null default false;
alter table events add column if not exists calendar_only boolean not null default false;
