# Live Reservations + Inquiry Pipelines — Design

**Date:** 2026-09-04
**Status:** Approved, building

## Overview

Turn four dead-end forms into real database writes, and turn three admin pages
into working queues. One shared pattern applied to facility reservations and
three inquiry types. Submitters are anonymous (contact fields only, matching the
schema's nullable `user_id`). Admin actions are gated by a shared env access
code.

**In scope**

- Facility reservations: `/centris/reserve` write path + `/admin/reservations` queue
- Live court availability (replace the `hour % 7 === 3` fake in `getCourtSlots`)
- Dgroup inquiries: form → `dgroup_inquiries`, surfaced in `/admin/dgroups`
- Volunteer applications: form → `volunteer_applications`, surfaced in `/admin/volunteers`
- Minimal admin auth: `/admin/login`, shared code, signed cookie, `requireAdmin()`

**Out of scope**

- Payments, email/SMS delivery
- Submitter authentication / member accounts
- GLC registration writes (`glc_registrations.user_id` is NOT NULL — needs auth).
  GLC pages keep reading live/static program + class data only.
- Real-time availability push; page uses `force-dynamic` + revalidate on write

## Architecture

### 1. Supabase client seam — `src/lib/supabase/server.ts`

Server-only. Builds a Supabase client from `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY`. Service role: there is no user session, so RLS is
bypassed and the app (admin cookie + server actions) is the trust boundary.

```ts
import "server-only";
export function hasSupabase(): boolean; // both env vars present
export function supabaseAdmin(): SupabaseClient; // throws if !hasSupabase()
```

Add to `.env.example`:

```
# Supabase — leave blank to run on static seed data (reads) and disable writes.
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Shared admin access code. Unset => /admin is read-only.
ADMIN_ACCESS_CODE=
```

### 2. `src/lib/queries.ts` stays the only read seam

These functions gain a live branch — `if (hasSupabase())` query the DB, else
return today's static data unchanged:

- `getCourtSlots(facilitySlug, courtId, dateKey)` — real overlap + blackout marking
- `getReservableFacilities()` — from `facilities` where `is_reservable`
- `getOpenDgroups()` / `getDgroup(id)` — unchanged shape
- `getVolunteerRoles()` / `getVolunteerRole(slug)` — unchanged shape

New read functions:

- `getReservations()` — all reservations for the satellite, newest first
  (admin-scoped; distinct from the demo `getMyReservations()`, which stays)
- `getDgroupInquiries()` — all rows, newest first
- `getVolunteerApplications()` — all rows, newest first

Result: the site runs with zero config; "going live" = set the two Supabase
env vars.

### 3. Write path — server actions

New files, each `"use server"`:

- `src/app/actions/reservations.ts` — `createReservation(prev, formData)`
- `src/app/actions/inquiries.ts` — `submitDgroupInquiry`, `submitVolunteerApplication`
- `src/app/actions/admin.ts` — `setReservationStatus`, `setInquiryStatus`,
  `setApplicationStatus`, `adminLogin`, `adminLogout`

Each write action:

1. (admin actions only) `await requireAdmin()` — throws/redirects if no cookie
2. Validate via a hand-rolled schema helper in `src/lib/validation.ts`
   (mirrors the existing `validate()` style; no new dependency)
3. If `!hasSupabase()` → return `{ ok: false, formError: "Submissions aren't
   wired up in this environment yet." }`
4. Insert / update via `supabaseAdmin()`
5. `revalidatePath(...)` the affected pages
6. Return `{ ok: true, reference }` or `{ ok: false, fieldErrors, formError }`

### 4. Forms become `useActionState` clients

`booking.tsx`, `apply.tsx`, `interest-form.tsx`, and the Dgroup join form swap
`setSent(true)` for `useActionState(action, initialState)`. Existing `Field` /
`FormSuccess` / `focusFirstInvalid` / `controlClass` UI is kept. Success screen
shows the real reference number. Pending state uses `useFormStatus` /
the `isPending` from `useActionState` to disable the submit button.

## Data flow

### Reservation submit

1. Client form → `createReservation(prev, formData)`
2. Validate: name, email (regex), participants (int ≥ 1), date (`YYYY-MM-DD`,
   not past), start/end (`HH:MM`, end > start), facility/court known
3. Build `during` as a `tstzrange` `[startISO, endISO)` in Manila time
4. Insert into `reservations`: `status: 'pending'`, `user_id: null`,
   `satellite_id` (from `src/data/center.ts` / env `CENTRIS_SATELLITE_ID`),
   denormalized `contact_name` / `contact_email` / `contact_mobile` /
   `organization` / `purpose` / `activity_name` / `participants` / `layout`
5. On Postgres `23P01` (exclusion_violation) → `{ ok: false, formError: "That
   slot was just taken. Pick another time." }`, form stays filled
6. On success → `revalidatePath('/centris/reserve')`,
   `revalidatePath('/admin/reservations')`, return `{ ok: true, reference }`

**Reference code** — `src/lib/reference.ts`: `CTR-` + first 6 hex of the row
uuid, uppercased (e.g. `CTR-9F3A1C`). Inquiries use `DG-` / `VOL-` prefixes.
Pure, deterministic, formatted; unit-tested.

### Availability read — `getCourtSlots` live branch

- Query `reservations` where `court_id = $court` (or `facility_id = $facility`
  and `court_id is null`), `status in ('pending','approved')`, and `during &&`
  the requested day's Manila range
- Query `facility_blackouts` overlapping the same range
- Pure marking function `markSlots(dayKey, reservations, blackouts)` in
  `src/lib/availability.ts` returns the hour grid with
  `open` / `pending` / `reserved` / `blackout`; unit-tested
- The query wrapper in `queries.ts` just fetches and calls `markSlots`

### Admin queue — `/admin/reservations`

- Page calls `await requireAdmin()` then `getReservations()`
- Groups: pending / approved / past (`completed` | `cancelled`)
- Row actions call `setReservationStatus(id, nextStatus)` — server action,
  `requireAdmin()`, `update reservations set status`, `revalidatePath`
- Allowed transitions: pending → approved | cancelled; approved → completed |
  cancelled

### Inquiries

- `submitDgroupInquiry` — insert `dgroup_inquiries`: `full_name`, `email`,
  `mobile`, `age_bracket`, `message`, `dgroup_id` (nullable), `user_id: null`,
  `status` default `'new'`
- `submitVolunteerApplication` — insert `volunteer_applications`: `full_name`,
  `email`, `mobile`, `message`, `role_id`, `user_id: null`, `status` default
- `/admin/dgroups` and `/admin/volunteers` list rows with a status `<select>`
  bound to `setInquiryStatus` / `setApplicationStatus` (enum values per
  `inquiry_status` / `application_status`)

## Admin authorization

- `src/lib/admin-auth.ts`
  - `requireAdmin()` — reads `admin_session` cookie; if `ADMIN_ACCESS_CODE`
    is set and the cookie's value ≠ `sha256(ADMIN_ACCESS_CODE)`, `redirect('/admin/login')`
  - `isAdminConfigured()` — `ADMIN_ACCESS_CODE` present
- `/admin/login/page.tsx` — one password field → `adminLogin` action compares
  to env, sets httpOnly `admin_session` = `sha256(code)`, `redirect('/admin')`
- `adminLogout` clears the cookie
- If `ADMIN_ACCESS_CODE` is unset: `/admin/**` pages render normally but
  read-only, with an `AdminNote` saying "Read-only: no access code configured."
  Mutating actions early-return `{ ok: false, formError }`.

## Error handling

| Case | Behavior |
|---|---|
| Field validation fails | Field errors from action, rendered by `Field`; `focusFirstInvalid` |
| Double-booking (`23P01`) | Form-level message, form stays filled |
| Supabase insert/query error | Generic "Something went wrong on our end — try again in a moment." + `console.error` |
| Missing Supabase env | Reads fall back to static; writes return "not wired up in this environment yet" |
| Missing admin code | `/admin` read-only with a note |

## Testing

- `src/lib/reference.test.ts` — code derivation: stable, formatted, prefix per type
- `src/lib/availability.test.ts` — `markSlots` given reservations + blackouts
- `src/lib/validation.test.ts` — each form's field validators
- Server actions / Supabase calls: not unit-tested; manual checklist below
- `npm run typecheck` + `npm run build` green **with and without** env vars

### Manual checklist (post-build, needs a Supabase project)

1. Submit a reservation → row appears in `/admin/reservations` pending
2. Submit an overlapping reservation → "that slot was just taken"
3. Approve it in admin → status flips, `/centris/reserve` grid shows the hour reserved
4. Submit a Dgroup inquiry and a volunteer application → appear in their admin queues
5. Change a queue status → persists on reload
6. Unset `ADMIN_ACCESS_CODE` → `/admin` read-only
7. Unset Supabase env → site builds and renders on static data; forms say "not wired up"

## Files

**New**

- `src/lib/supabase/server.ts`
- `src/lib/admin-auth.ts`
- `src/lib/reference.ts`
- `src/lib/availability.ts`
- `src/lib/validation.ts`
- `src/app/actions/reservations.ts`
- `src/app/actions/inquiries.ts`
- `src/app/actions/admin.ts`
- `src/app/admin/login/page.tsx`
- `src/lib/reference.test.ts`, `src/lib/availability.test.ts`, `src/lib/validation.test.ts`

**Changed**

- `src/lib/queries.ts` — live branches + new admin read functions
- `src/app/centris/reserve/booking.tsx` — `useActionState`
- `src/app/serve/[slug]/apply.tsx` — `useActionState`
- `src/app/grow/find-a-dgroup/[id]/interest-form.tsx` — `useActionState`
- Dgroup join form component — `useActionState`
- `src/app/admin/reservations/page.tsx` — live data + row actions
- `src/app/admin/dgroups/page.tsx` — inquiries queue
- `src/app/admin/volunteers/page.tsx` — applications queue
- `src/app/admin/layout.tsx` (or each page) — `requireAdmin()`
- `.env.example`
