# Calm site: the Calendly-inspired look, everywhere

Date: 2026-09-30. Decided with Ralph after the calm reservation pages
(`2026-09-30-calm-reservations-design.md`). Mockups are in
`.superpowers/brainstorm/` and aren't committed.

## Goal

Give every public page the same calm look the reservation pages have. The CCF
colours and Montserrat stay; the rest may change. Ralph sees a full preview
before anything merges.

## Decisions

| # | Question | Choice |
|---|---|---|
| 1 | Order | Everything at once, through the shared pieces, then a page-by-page tidy |
| 2 | Home opening | Photo in a rounded frame, with the Sunday card overlapping its bottom edge |
| 3 | Footer | Stays dark, made calmer |

## Foundation (one change, every page)

- **`--paper`** becomes `#f7f9f9` (the booking `mist`), so every page ground
  is the calm pale.
- **`.surface`** takes the calm card's look: white, 24px corners, no outline
  ring, and the three-layer teal-tinted shadow. Link surfaces still lift on
  hover.
- **`.surface-grid` and `.photo`** get 24px corners. The grid's gap colour is
  `rule`.
- **`Eyebrow`** becomes a short sentence-case teal label (`0.95rem`,
  semibold) with no rule and no tracked capitals. The `rule` prop stays
  accepted but draws nothing.
- **`Pill` (Badge)** becomes the soft rounded badge: sentence case,
  `0.8rem` medium, washes (`clay-wash`, `sky-wash`, `rule`), no border.
- **`controlClass`** (every form input) becomes the calm input: `mist` fill,
  no border, 14px corners, a teal ring on focus, and a `sky-wash` fill when
  invalid.
- **`Section`** padding goes from `py-12 sm:py-24` to `py-14 sm:py-24`.
- **Buttons:** the primary pill gets the soft teal shadow.

## Header and footer

- **Header:** the ground is white. Nav links are sentence case, 15px medium,
  `ink`, and the current page is `clay` with a small teal dot under it. The
  mobile menu buttons become pills.
- **Footer:** stays `night`. Column headings are sentence case
  (`0.95rem` semibold `clay-lift`). The teal strip is unchanged.

## Home

- **Welcome:** a `mist` band with padding around one rounded frame
  (`rounded-[2rem]`, overflow hidden), which holds the photo, the gradient and
  the headline.
  - The frame is about 78svh on phones and 72svh on desktop.
  - The visit card moves out of the photo. It sits in the `Container` below
    and overlaps the frame's bottom edge (a negative top margin) on every
    screen size.
- **Next steps:** cards on `.surface`, with icons in `clay-wash` circles.
- **Last Sunday:** the video sits in a `.surface` frame.

## Inner pages

- `PageHeader` keeps the teal wash. The eyebrow is the calm `Eyebrow`, the
  title is weight 600, the lead is `ink-mute`, and the photo gets 24px
  corners.
- Cards in `components/cards.tsx` inherit the look through `.surface`.
  Where a card sets its own border or hard edge, it's softened (image tops
  rounded with the card).
- The page-by-page tidy covers Visit, Watch, Connect, Events, Prayer Wall,
  About, Contact and Sign in, at 375px and desktop. Anything that reads
  tight, boxed or uppercase is fixed.
- `/admin/**` is out of scope.

## Delivery

1. **PR A:** foundation, header, footer and home.
2. **PR B:** the page-by-page tidy.

Before each merge, Ralph gets screenshots from a local run (phone and desktop)
and the Vercel preview link, and approves.

## Testing

- Typecheck, lint, tests and the build must pass.
- `button-variants.test` and `badge-variants.test` are updated where they pin
  class strings.
- Local screenshots cover: home, visit, watch, events, contact, reserve and the
  footer, at 375px and 1280px.
