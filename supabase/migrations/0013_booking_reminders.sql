-- Day-before reminder emails (2026-09-30). Stamped once the email goes out, so
-- the daily job never sends the same reminder twice.
alter table dgroup_table_bookings add column if not exists reminder_sent_at timestamptz;
alter table reservations add column if not exists reminder_sent_at timestamptz;
