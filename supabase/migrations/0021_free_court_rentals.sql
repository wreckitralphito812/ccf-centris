-- CCF Centris — free court rentals (Adrian, 2026-11-14).
--
-- The Gym is free to use for now: a rental is booked with no payment, so its
-- amount is 0 and it has no payment screenshot. 0020 asked for both. The
-- screenshot's length rule still applies whenever there is one, and fees can
-- start again without another change here (COURTS_FREE in
-- src/lib/court-rentals.ts).

alter table court_rentals drop constraint if exists court_rentals_amount_php_check;
alter table court_rentals add constraint court_rentals_amount_php_check check (amount_php >= 0);
alter table court_rentals alter column payment_proof drop not null;
