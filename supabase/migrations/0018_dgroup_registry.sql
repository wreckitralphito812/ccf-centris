-- Dgroup registry (2026-10-08). Leaders register their Dgroups from their
-- account; the Centris team approves them in the admin console. Only admins
-- see the list for now (people looking for a group still use CCF Main's
-- JotForm). Table bookings can name the Dgroup they're for.
--
-- The `dgroups` table came with the original template and has never held a
-- real row; the twelve the admin dashboard counted were seed data in code.

alter table dgroups
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'changes_requested', 'approved', 'declined', 'archived')),
  add column if not exists leader_name text
    check (leader_name is null or char_length(btrim(leader_name)) between 2 and 120),
  add column if not exists leader_mobile text
    check (leader_mobile is null or char_length(btrim(leader_mobile)) between 7 and 30),
  add column if not exists leader_email text,
  add column if not exists co_leader_name text,
  add column if not exists meets_where text not null default 'centris'
    check (meets_where in ('centris', 'elsewhere', 'online')),
  add column if not exists frequency text not null default 'weekly'
    check (frequency in ('weekly', 'every_other_week', 'monthly')),
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists dgroups_leader on dgroups (leader_id);
create index if not exists dgroups_status on dgroups (satellite_id, status);

alter table dgroup_table_bookings
  add column if not exists dgroup_id uuid references dgroups(id) on delete set null;

create index if not exists dgroup_table_bookings_dgroup on dgroup_table_bookings (dgroup_id);

-- Registrations hold leaders' mobile numbers and emails, and the list is for
-- the team only. The template let anyone with the anon key read open groups,
-- and its dgroups_public view (which runs as its owner, past RLS) showed
-- them too. Close both; the site reads with the service role.
drop policy if exists dgroups_public_read on dgroups;
revoke all on dgroups_public from anon, authenticated;
