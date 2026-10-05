# Announcements: one form for What's Happening and the screens

Date: 2026-10-05. Ralph wants ministries (not very technical) to post to What's
Happening through a simple, standard process they can follow as an SOP.

## What they do today

Ministries already make every announcement in five sizes and send them in
through what looks like a Google Form (file names read "TITLE SIZE - Submitter
(Placement)") into a Drive folder:

| Placement | Size |
|---|---|
| Main Hall TV | 1920×1080 (16:9) |
| Gallery TV | 1080×1920 (9:16) |
| Main Hall LED | 4608×1344 (~3.4:1) |
| Standee | 500×1000 (1:2) |
| Social media | 1080×1350 (4:5) |

Reviewed examples: Family Camp Lite (CCF North EDSA / ACROSS, Nov 7) and
Raised Around Jesus (The Neighborhood, Oct 10 / Nov 7 / Nov 14). Strong,
consistent design. The gaps for the web: every fact (date, time, fees, the
sign-up QR) lives only inside the picture, so phones can't tap to register,
the site can't add it to calendars, and details drift between sizes.

The Main Hall TV file is already the 16:9 shape What's Happening uses, so
ministries make nothing new.

## Decisions (Ralph, 2026-10-05)

- **Submitters:** approved ministry reps only. Anyone else sees "Ask for
  access", which emails the admin inbox; an admin adds them.
- **One form for everything:** all five sizes are collected in the same
  submission. The website uses Main Hall TV (and Social on phones); the media
  team downloads the rest from the admin page. Replaces the Google Form + Drive.
- **Review:** in the admin console (shared code), Admin → Announcements.
  The admin inbox is emailed when something is waiting.
- **Categories:** Church-wide events; Trainings and classes.

## How it works

1. **Submit** at `/announce` (signed in, approved rep), about three minutes:
   - Artwork: Main Hall TV (required); Gallery TV, Main Hall LED, Standee,
     Social (optional). Each slot checks the file's shape and shows a preview
     of how the card will look on the site.
   - Details: title; ministry; category; dates (start, end; "Add another
     date" for series); venue (list + "Other"); one sentence (≤ 160
     characters); sign-up link or "No sign-up needed"; fee or free; contact
     (from the account).
   - Sent → confirmation on screen and by email.
2. **Review** in Admin → Announcements → Waiting: the card exactly as it will
   appear, the details, and every file. Approve, Ask for changes (note),
   or Decline. The submitter is emailed each time.
3. **Live** once approved: What's Happening (Coming up + its category row),
   the month calendar, and its own page with Register, Add to calendar and
   Share. Phones show the Social artwork when there is one.
4. **Screens:** Admin → Announcements → Screens lists what's running this week
   with download links per placement, named consistently
   ("2026-11-07 Family Camp Lite – Main Hall LED.jpg").
5. **Down** automatically after the last date. An edit by the submitter after
   approval goes back to Waiting.

## Data

- Migration: extend `events` (status adds pending / changes_requested /
  declined; submitted_by, ministry, registration_url, fee_note, review_note,
  reviewed_at, artwork jsonb keyed by placement), `event_dates` for series,
  and `announcement_reps` (email, name, ministry, added_at; access requests
  as rows with approved_at null). Server-only like the other tables.
- Artwork in the existing Vercel Blob store via client uploads, allowed only
  for approved reps; images only, size-capped.
- What's Happening, the calendar and event pages read published rows instead
  of seed data. The old built-in registration form stays parked; sign-up is
  the ministry's own link.

## The ministry SOP (one page)

1. Make your artwork in the usual five sizes.
2. At least **10 days before**, go to ccfcentris.org.ph/announce.
3. Upload the files: Main Hall TV is required, the rest if you have them.
4. Type the key details. The picture alone isn't enough: date, time, place
   and the sign-up link must be typed.
5. You'll get an email within **2 working days**. Changes after approval go
   back for review.
