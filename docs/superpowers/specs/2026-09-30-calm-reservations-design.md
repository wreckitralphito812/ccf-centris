# Calm reservations: Calendly-inspired redesign of the booking pages

Date: 2026-09-30. Decided with Ralph in a brainstorming session, with mockups in
`.superpowers/brainstorm/` (not committed). Scope: `/reserve`, `/reserve/dgroup`,
`/centris/reserve`, `/my/reservations`, plus Book again and a day-before reminder.
A site-wide pass in the same look is the next, separate spec.

## Goal

Make every reservation page feel calm and modern, the way Calendly does, so
anyone (older members included) can book without help. Keep the CCF brand:
the colours (teal `#007682` for type and controls, brand teal `#00a6b6` for large
shapes, maroon `#7d1235` as the secondary, the inks and paper grounds) and
Montserrat. Everything else about the look may change.

## Decisions

| # | Question | Choice |
|---|---|---|
| 1 | Pages | All four reservation pages |
| 2 | What to borrow from Calendly | Booking layout feel, calm look, booking-type cards, confirmation and manage |
| 3 | Booking layout | Keep today's one-column flow and bottom bar, restyled (not the three-panel calendar) |
| 4 | How far | Hybrid: Calendly cards and choices, CCF pill buttons |
| 5 | `/reserve` | Booking-type cards with "Your next booking" on top |
| 6 | My reservations | Next up, then the rest; past folded away |
| 7 | Confirmation | Centred card |
| 8 | New features | Book again next week; reminder email the day before |
| 9 | Density | The calm v2 mockup: much more air, lighter weights, softer lines |
| 10 | Scope of the look | Reservation pages now; the rest of the site next (separate spec) |

## The calm look

New classes in `globals.css` (`@layer components`), used by the reservation pages:

- **`.calm-card`**: white, 24px corners, no border, a three-layer teal-tinted
  shadow (`0 1px 2px rgb(0 95 104/.04), 0 8px 24px -8px rgb(0 95 104/.08),
  0 30px 60px -30px rgb(0 95 104/.12)`), padding 28–32px.
- **Ground**: reservation sections sit on `#f7f9f9` (a new `--mist` token, one
  step lighter than `--paper`).
- **Soft rule** between questions: 1px `#edf2f3` (`--rule`), 32px of space
  either side.
- **Choice rows** (times, rooms, time blocks): 14px corners, 1px `#dfe8e9`
  border, 18–20px padding, 17px semibold. Chosen: solid teal, white text.
  Can't be picked: `--mist` fill, grey text, the reason on the right.
- **Date circles** (days): a weekday label over a 48px circle. Open days are pale
  teal (`#e9f4f5`) with teal numbers; the chosen day is solid teal with a soft
  teal glow; closed days are plain grey, with "Full" or "Past" under them.
- **Headcount**: 52px round −/+ with a 1px soft border; the number in a 72×52
  `--mist` box you can type in; empty until chosen.
- **Inputs**: `--mist` fill, no border, 14px corners, a teal ring on focus.
- **Status badges**: rounded, 13px medium. Confirmed: `#e9f4f5`/`#005f68`.
  Awaiting approval: `#f8ecf0`/maroon. Declined, cancelled, past: `#eef2f3`/
  `ink-mute`. Replaces the amber and emerald Tailwind colours, which aren't CCF.
- **Icons**: a small line set (calendar, clock, people, pin, check), 1.5px stroke,
  in `src/components/icons.tsx`, replacing emoji and text arrows.
- **Type**: question headings 19px semibold (no numbered circles); hints 15px
  `ink-mute`; body 16–17px.
- **Buttons**: unchanged pills; the main one gets a soft teal shadow.
- **Bottom bar**: white at 96%, a 1px `--rule` top edge, the summary on the left,
  and the pill on the right.

The page header (with its teal wash), the footer, and the site nav stay as they are.

## Pages

### `/reserve`
- The page header stays.
- **Your next booking** (members who are signed in and have one): a `night` card with
  the table or room and when, plus Manage → `/my/reservations`.
- Three `.calm-card`s in a grid:
  - **Dgroup table**: badge "Mon–Fri"; 2½ hours; up to 12; confirmed at once;
    "Book a table".
  - **Ministry room**: badge "Mon–Sat"; 9 AM to 9:30 PM; rooms for 36 to 90;
    the facilities team confirms; "Request a room".
  - **The court**: greyed out, with a "Soon" badge and no button.

### `/reserve/dgroup`
- Same four questions and server contract as today, in one `.calm-card`:
  - date circles for the week;
  - time rows showing tables free, Only N left, or Full;
  - the headcount;
  - "Your details" as a `--mist` panel with Change, then the policy tick with
    "Read the 5 policies".
- The bottom bar, as today.
- "Your upcoming tables" above the form becomes a single "Next up" style card
  linking to My reservations.

### `/centris/reserve`
- The same two steps and server contract as today.
- **Step 1:**
  - date circles Mon–Sat with week arrows and the month label;
  - Morning, Afternoon, Evening and Other time as choice rows, two per line
    from `sm`;
  - the headcount and set-up chips;
  - rooms as choice rows with a round check and their status.
- **Step 2:** calm inputs, then the "Your request" summary panel with Change,
  and the policy tick.

### Confirmation (both flows)
- A centred `.calm-card`, max 560px:
  - a teal check mark in a circle;
  - "You're booked" (Dgroup) or "Request sent" (room);
  - the email note;
  - the details as icon rows;
  - the floor plan (Dgroup);
  - Google Calendar (solid) and Apple or Outlook (outline);
  - then the text links: Book the same time next week (Dgroup, when open),
    and My reservations.
- The room version adds the reference and the three-step "What happens next".

### `/my/reservations`
- **Next up:** the soonest upcoming booking of any kind (Dgroup table,
  or a pending or approved room), as a big `.calm-card`:
  - a label for when ("Today", "Tomorrow", "In N days", or the date after 6 days)
    beside the status badge;
  - the title;
  - icon rows;
  - the floor plan for tables;
  - the actions: Add to calendar (solid), Change (tables; opens today's change
    form), and Cancel (with confirm).
- **Later:** every other upcoming booking, in date order, as rows in one card:
  - date, title, one meta line, a badge, and Manage;
  - Manage expands the same actions inline.
- **Past bookings:** a closed `<details>` at the bottom, holding the same rows
  with no actions except Book again.
- **Empty:** a `.calm-card` saying "Nothing booked yet", with the two booking buttons.

## Book again

- **Where:**
  - "Book again" on every Dgroup table in My reservations (Next up, Later, Past);
  - "Book the same time next week" on the Dgroup confirmation.
- **Target date:** the first date in `bookableNights(today)` that has the same
  weekday as the booking, is later than it, and still has the slot open
  (`openSlots`).
  - With none, the button is replaced by "Opens Sunday" (plain text).
- **Action:** `rebookDgroupTable(id)` reads the booking scoped to
  `currentUser()`. It reuses the leader name, email, mobile, group size and slot,
  and treats the policies as accepted (same group, same rules). Then it books
  through the same assignment path as `reserveDgroupTable`, which is factored
  into a shared `bookTables()`.
- **Result:** the same `DgroupBookingResult`, so the UI shows the same
  confirmation card.
- **Errors:** as today:
  - "You already have a booking for that day and time";
  - the time filled up;
  - sign in again.

## Reminder the day before

- **Migration `0013_booking_reminders.sql`:** adds `reminder_sent_at timestamptz` to
  `dgroup_table_bookings` and `reservations`.
- **Route `src/app/api/cron/reminders/route.ts` (GET):**
  - Refuses with 401 unless `Authorization: Bearer ${CRON_SECRET}`, which Vercel
    Cron sends when `CRON_SECRET` is set. It also refuses when `CRON_SECRET` is
    unset, so the route can't be triggered from outside.
  - Finds tomorrow's (Manila) confirmed Dgroup bookings and approved room
    reservations with `reminder_sent_at is null`.
  - Emails each one: a new `reminder` kind in both email builders, with the
    details, a Change or cancel link, the Google link and the `.ics`.
  - Stamps `reminder_sent_at` only when the send succeeded.
  - Returns counts.
- **`vercel.json`:** `crons: [{ path: "/api/cron/reminders", schedule: "0 2 * * *" }]`,
  which is 10:00 AM Manila. Hobby allows one run a day, and the time may drift
  within the hour.
- **`.env.example`:** documents `CRON_SECRET`.
- **Limits:**
  - Resend's test sender only reaches the account owner until a domain is
    verified.
  - The free tier caps sending at 100 emails a day.

## Delivery

Three PRs, each merged and live on its own:

1. **Calm look and flows:** the tokens and classes, icons, `/reserve`, the Dgroup and
   room flows, and both confirmations. DESIGN.md gets a "Calm booking look"
   section.
2. **My reservations and Book again:** the page rebuild, `rebookDgroupTable`, and
   the `bookTables()` refactor with tests.
3. **Reminders:** the migration (applied with `supabase db push`), the route, the
   email kinds, the cron, and tests for picking tomorrow's bookings.

## Testing

- Unit tests (`node:test`):
  - Book again's target-date rule, including Sunday and full weeks.
  - Choosing tomorrow's reminders.
  - The "when" label (Today, Tomorrow, In N days).
  - The email builders' reminder kind.
- Each PR: typecheck, lint, all tests, the build.
- A local preview at 375px and desktop through a temporary unlisted page,
  because pages behind sign-in can't be reached locally.
- After merge: the production deploy and HTTP 200 on the four pages.

## Not in this spec

- A site-wide pass in the calm look: next spec.
- Changing a pending room request.
- A calendar-month view.
- Reschedule links that work without signing in.
