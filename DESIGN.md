# CCF Centris design

How the site looks and why, as settled after the design polish (PR #10) and
the booking-flow review (2026-09-30). Read this before adding a page or a
component. The tokens themselves live in `src/app/globals.css`; the shared
pieces in `src/components/ui.tsx` and `src/components/booking.tsx`.

## The feel

Professional and minimalist, but not bland. Most of the page is quiet white
and near-black type; life comes from a few deliberate things:

- soft white **surfaces** with rounded corners and a gentle lift, on a cool
  off-white ground;
- a **teal wash** in the top corner of every page header;
- **one full-strength teal moment** per page, the footer's gradient strip;
- **pill buttons** in sentence case;
- real photos of Centris, never stock.

If a page feels flat, reach for one of those before inventing something new.

## Colour

| Token | Hex | Use |
|---|---|---|
| `paper` | `#f4f7f7` | Page ground |
| `paper-deep` | `#e6eef0` | Deeper sections, skeletons |
| `paper-bright` | `#ffffff` | Surfaces, cards, inputs |
| `bone` | `#e2ebed` | Hover ground |
| `ink` | `#142021` | Headings |
| `ink-soft` | `#223032` | Body copy |
| `ink-mute` | `#4d5c5e` | Labels, dates, hints |
| `hairline` | `#d3dfe1` | Borders and rules |
| `clay` | `#007682` | The working teal: links, buttons, focus, accents on paper |
| `clay-deep` | `#005f68` | Hover for clay; error text |
| `clay-lift` | `#3ec6d0` | Teal type on the dark ground |
| `brand-teal` | `#00a6b6` | The exact CCF mark. Large flat shapes only, **never text** |
| `sky` | `#7d1235` | CCF maroon, the secondary |
| `moss` | `#55643f` | "Free" and other good-news statuses |
| `night` | `#16292a` | The dark ground (footer, dark sections) |

Rules:

- Use the tokens (`text-clay`, `bg-paper-bright`, …), never raw hex, and never
  shadcn's `hsl(var(--*))`.
- `brand-teal` fails contrast for text (2.57:1). Type and controls use `clay`.
- Inside `.bg-night`, `clay` turns into `clay-lift` automatically, so teal type
  stays readable on the dark ground. Buttons keep their own fill.
- Errors are `clay-deep`, bold, with `role="alert"`. There is no red.

## Type

Montserrat only, loaded once in the root layout.

| Class | Use |
|---|---|
| `.display-xl` / `.display-lg` / `.display-md` | Home hero and section titles |
| `.page-title` | The one title in a `PageHeader` |
| `.label` | Eyebrows, badges, small uppercase markers (tracked, 11–12px) |
| body | `text-ink-soft`, around 1rem–1.05rem, relaxed leading |

- Sentence case everywhere a person reads or taps. A `.label` on a link,
  button or summary inside `main` or the footer renders in sentence case by
  itself; uppercase tracking is only for eyebrows, badges and headings.
- Numbers that change in place (counts, prices, times in lists) get
  `tabular-nums`.
- Booking flows use a larger reading size: 1.05rem body, 1.3–1.4rem question
  titles, because older members book too.

## Shape and depth

- **Surfaces**: `.surface` for any card or panel: white, `0.875rem` corners,
  a hairline ring and a soft lift. A surface that is a link rises 2px on hover.
  `.surface-grid` is the "cells with 1px gaps" layout with the same corners.
  `.photo` gives images the same corners.
- **Choice cards** in forms: `rounded-2xl`, via `choiceClass()` in
  `components/booking.tsx`.
- **Buttons and chips**: `rounded-full`.
- **Inputs**: `rounded-lg` (forms) or `rounded-xl` (booking flows).
- These styles sit in `@layer components`, so a Tailwind utility on the same
  element still wins. Keep new shared classes there too.

## Buttons

Use `Button` / `ButtonLink` from `@/components/ui`, never hand-rolled classes.

- Tones: `primary` (teal), `ink`, `outline`, `ghost`, `sky`, and the
  `-on-dark` versions for night sections and photos.
- Sizes: `sm`, `md`, `lg`. One primary per view; everything else is outline,
  ghost, or a text link.
- Labels are verbs in sentence case: "Book my table", "Send request",
  "Get directions".

## Page anatomy

1. `PageHeader`: eyebrow, `.page-title`, one-sentence lead, optional photo.
   The teal radial wash is built in.
2. `Section`s with `Container`. Tones `paper`, `deep`, `bright`, `ink`,
   alternating so long pages have rhythm.
3. The footer, whose teal gradient strip is the page's one loud colour.

Content with no value yet stays `null` in `src/lib/site.ts`, and the UI hides
it. No placeholders, no "coming soon" boxes unless something is truly about
to open.

## Booking flows

The Dgroup table form (`/reserve/dgroup`) and the room request
(`/centris/reserve`) share one pattern, from the 2026-09-30 design review. Use
it for any new booking or sign-up flow.

- **Numbered questions**, one plain question each ("Which day?", "What
  time?", "How many people?"), with `Question` from `components/booking.tsx`.
- **Show availability before the choice**: "12 tables free", "Only 3 tables
  left", "Full", "Taken 1:00 PM – 3:00 PM", "Too small for 60". Anything that
  can't be picked is disabled and says why.
- **Headcounts start empty**, with big − / + (`StepButton`) and a box you can
  type in. Nobody books for a number they didn't choose.
- **Known details fold** into one card with a Change button (`ContactFields`).
- **One tick for the policies**, with the policies a tap away.
- **A bar pinned to the bottom** (`BookingBar`) shows the answers so far, or
  the next thing to answer, and holds the one button. It stays disabled until
  the form is complete. The form above has `pb-36` so the bar never covers
  the last field.
- **Confirmations** say what happened in large type, what happens next, and
  offer **Add to calendar** (`AddToCalendar`).
- **Errors** move focus to the first thing to fix, on the right step.

## Accessibility floor

- Targets are at least 44px (`.tap`) on touch screens, and 56px in booking
  flows. Dense footer lists use `.tap-dense` (36px).
- Single choices are real radio groups (a visually hidden `input` inside a
  `label`); multiple choices are checkboxes. Arrow keys and screen readers
  then just work.
- Visible focus: a 2px teal ring (`has-[:focus-visible]:ring-2` on custom
  choice cards).
- Text contrast is at least 4.5:1. Check any new colour pairing.
- Motion is small and optional: `.btn-press`, the surface lift, the skeleton
  shimmer. All of it respects `prefers-reduced-motion`.

## Speed is part of the design

- Every page that waits on data has a `loading.tsx` with `PageSkeleton`, so a
  tap shows the page frame at once.
- Read everything a page needs in parallel (`Promise.all`), and prefer one
  query for a week over one per slot.
- Functions run in `syd1`, next to the database (`vercel.json`). Outside
  calls (CCF Net, YouTube) have time limits and fail soft.

## Don't

- Don't add a second typeface, drop shadows beyond `.surface`, gradients
  other than the header wash and footer strip, or emoji in the UI.
- Don't use `brand-teal` for text, or put white text on it.
- Don't write ALL-CAPS buttons or links.
- Don't show a control that can't work; hide it or say why it's off.
