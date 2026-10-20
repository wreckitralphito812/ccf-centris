-- CCF Centris — Gym court rentals (Adrian, 2026-10-20).
--
-- Leaders of a registered Dgroup rent the Gym's courts in the hours the
-- Sports Ministry leaves open: pickleball and badminton by the court (up to
-- three at once, ₱450 a court an hour), volleyball and basketball by the
-- whole floor (one court, ₱1,800 an hour). Whole hours, one to three of them.
-- The schedule, prices and rules live in src/lib/court-rentals.ts.
--
-- A rental is confirmed the moment the renter uploads a screenshot of their
-- payment; staff look at it in the admin console and cancel any that wasn't
-- paid. Renters can't cancel, but can move a rental to another open time.
-- The screenshot itself is in a private storage bucket (court-payments),
-- which the server creates on first use; the row keeps its path.
--
-- Two renters can't take the same court in the same hour: each rental holds
-- (day, hour, court) rows under a unique index, written in the same
-- transaction as the rental, like the Dgroup table holds (0008, 0015). A
-- clash raises 23505 and the site says the time was just taken.
-- Server-only, like the rest of the booking tables.

create table court_rentals (
  id              uuid primary key default gen_random_uuid(),
  satellite_id    uuid not null references satellites(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  dgroup_id       uuid references dgroups(id) on delete set null,
  sport           text not null check (sport in ('pickleball', 'badminton', 'volleyball', 'basketball')),
  booked_on       date not null,
  start_hour      int not null check (start_hour between 0 and 23),
  hours           int not null check (hours between 1 and 3),
  courts          int not null check (courts between 1 and 3),
  court_numbers   int[] not null,
  amount_php      int not null check (amount_php > 0),
  payment_proof   text not null check (char_length(payment_proof) between 1 and 300),
  renter_name     text not null check (char_length(btrim(renter_name)) between 2 and 120),
  contact_mobile  text not null check (char_length(btrim(contact_mobile)) between 7 and 30),
  renter_email    text not null check (char_length(renter_email) between 3 and 200),
  agreed_rules_at timestamptz not null,
  status          text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at      timestamptz not null default now(),
  changed_at      timestamptz,
  cancelled_at    timestamptz,
  check (start_hour + hours <= 24),
  check (cardinality(court_numbers) = courts)
);

create index on court_rentals (satellite_id, booked_on);
create index on court_rentals (user_id);

create table court_rental_holds (
  rental_id     uuid not null references court_rentals(id) on delete cascade,
  satellite_id  uuid not null references satellites(id) on delete cascade,
  booked_on     date not null,
  hour          int not null check (hour between 0 and 23),
  court_no      int not null check (court_no between 1 and 3)
);

create unique index court_rental_holds_one_per_court on court_rental_holds (satellite_id, booked_on, hour, court_no);
create index on court_rental_holds (rental_id);

alter table court_rentals enable row level security;
alter table court_rental_holds enable row level security;
revoke all on court_rentals, court_rental_holds from anon, authenticated;
grant select, insert, update, delete on court_rentals, court_rental_holds to service_role;

-- The lowest-numbered courts free for every hour of the rental, or null when
-- fewer than p_courts are. The same courts all the way through, so a group
-- doesn't change courts on the hour.
create function free_courts(
  p_satellite uuid, p_date date, p_start int, p_hours int, p_courts int, p_capacity int, p_except uuid
) returns int[]
language sql stable as $$
  select case when count(*) >= p_courts then (array_agg(c order by c))[1:p_courts] end
  from generate_series(1, p_capacity) as c
  where not exists (
    select 1 from court_rental_holds h
    where h.satellite_id = p_satellite
      and h.booked_on = p_date
      and h.hour >= p_start and h.hour < p_start + p_hours
      and h.court_no = c
      and (p_except is null or h.rental_id <> p_except)
  )
$$;

create function book_court_rental(
  p_satellite uuid, p_user uuid, p_dgroup uuid, p_sport text, p_date date, p_start int,
  p_hours int, p_courts int, p_capacity int, p_amount int, p_proof text,
  p_name text, p_mobile text, p_email text
) returns uuid
language plpgsql as $$
declare
  v_courts int[];
  v_id uuid;
begin
  v_courts := free_courts(p_satellite, p_date, p_start, p_hours, p_courts, p_capacity, null);
  if v_courts is null then
    raise exception 'courts taken (court_rental_holds)' using errcode = '23505';
  end if;

  insert into court_rentals
    (satellite_id, user_id, dgroup_id, sport, booked_on, start_hour, hours, courts, court_numbers,
     amount_php, payment_proof, renter_name, contact_mobile, renter_email, agreed_rules_at)
  values
    (p_satellite, p_user, p_dgroup, p_sport, p_date, p_start, p_hours, p_courts, v_courts,
     p_amount, p_proof, p_name, p_mobile, p_email, now())
  returning id into v_id;

  insert into court_rental_holds (rental_id, satellite_id, booked_on, hour, court_no)
    select v_id, p_satellite, p_date, hr, c
    from generate_series(p_start, p_start + p_hours - 1) as hr, unnest(v_courts) as c;

  return v_id;
end $$;

-- Move a renter's own confirmed rental to another day or start time, with the
-- same sport, hours and courts (so the same price). Its own holds count as
-- free, so moving by an hour can keep the same courts.
create function move_court_rental(
  p_id uuid, p_user uuid, p_date date, p_start int, p_capacity int
) returns int[]
language plpgsql as $$
declare
  v_row court_rentals%rowtype;
  v_courts int[];
begin
  select * into v_row from court_rentals
    where id = p_id and user_id = p_user and status = 'confirmed'
    for update;
  if v_row.id is null then
    raise exception 'rental not found' using errcode = 'P0002';
  end if;

  v_courts := free_courts(v_row.satellite_id, p_date, p_start, v_row.hours, v_row.courts, p_capacity, p_id);
  if v_courts is null then
    raise exception 'courts taken (court_rental_holds)' using errcode = '23505';
  end if;

  delete from court_rental_holds where rental_id = p_id;

  update court_rentals
    set booked_on = p_date, start_hour = p_start, court_numbers = v_courts, changed_at = now()
    where id = p_id;

  insert into court_rental_holds (rental_id, satellite_id, booked_on, hour, court_no)
    select p_id, v_row.satellite_id, p_date, hr, c
    from generate_series(p_start, p_start + v_row.hours - 1) as hr, unnest(v_courts) as c;

  return v_courts;
end $$;

-- Staff cancel a rental (one that wasn't paid): its courts are freed at once.
create function cancel_court_rental(p_id uuid) returns boolean
language plpgsql as $$
begin
  update court_rentals set status = 'cancelled', cancelled_at = now()
    where id = p_id and status = 'confirmed';
  if not found then
    return false;
  end if;
  delete from court_rental_holds where rental_id = p_id;
  return true;
end $$;

revoke all on function free_courts(uuid, date, int, int, int, int, uuid) from public, anon, authenticated;
revoke all on function book_court_rental(uuid, uuid, uuid, text, date, int, int, int, int, int, text, text, text, text) from public, anon, authenticated;
revoke all on function move_court_rental(uuid, uuid, date, int, int) from public, anon, authenticated;
revoke all on function cancel_court_rental(uuid) from public, anon, authenticated;
grant execute on function free_courts(uuid, date, int, int, int, int, uuid) to service_role;
grant execute on function book_court_rental(uuid, uuid, uuid, text, date, int, int, int, int, int, text, text, text, text) to service_role;
grant execute on function move_court_rental(uuid, uuid, date, int, int) to service_role;
grant execute on function cancel_court_rental(uuid) to service_role;
