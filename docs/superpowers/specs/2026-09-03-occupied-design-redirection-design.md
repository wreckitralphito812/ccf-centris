# Design Redirection: "Occupied"

**Date:** 2026-09-03
**Status:** Approved, ready for implementation planning
**Scope:** Homepage as reference implementation, then cascade to remaining routes

---

## Problem

The CCF Centris site is well-built but reads as templated. Three specific
failures against the goal of a human, authentic feel:

1. **Texture is decorative, not structural.** `globals.css` defines grain,
   halftone, tape, and hand-drawn underline. All are ornaments applied on top
   of a conventional layout. Authenticity comes from irregular composition,
   not from stickers on a regular grid.

2. **Real faces are hidden.** `src/components/hero-backdrop.tsx:99-108` stacks
   an 85% paper wash, a gradient, and a dot screen over live CCF worship
   footage. The one genuinely human asset on the site is obscured to roughly
   15% clarity in order to guarantee headline contrast. That is a typography
   problem being solved with a blanket.

3. **Eleven identical sections.** `src/app/page.tsx` is 762 lines: a hero
   followed by ten instances of `Section` -> `SectionHead` -> grid-of-cards.
   Uniform rhythm is the loudest template signal on the page, louder than any
   font or colour choice.

## Core reframe

The current design treats **paper as the world and photography as an intruder**.
The redirection inverts this: **real CCF footage is the world, and paper is a
material placed on top of it.**

Every design token stays. Teal `#007682`, brand teal `#00a6b6`, maroon
`#72042c`, Fraunces, Montserrat, Caveat, the grain overlay. What changes is the
figure-ground relationship: paper stops being the default background and
becomes a deliberate material - cards, panels, and slips over photographs of
actual worship, actual courts, actual Dgroups.

The humanity is not asserted through type choices. It is shown through faces
CCF has already published, already piped into this codebase on a 15-minute
revalidate via `src/lib/youtube.ts`.

## Constraints

Decided with the user, 2026-09-03:

- **Imagery source: CCF's public imagery only.** YouTube thumbnails and
  embeds, plus anything else CCF has already published. No commissioned
  photography, no stock, no invented imagery. Consistent with the existing
  project rule against presenting seeded content as confirmed CCF fact.
- **Scope: homepage first as a reference implementation**, then cascade the
  patterns outward to the other routes.
- **Motion: one cinematic moment only** - the hero. Everything below is
  editorial reveal. Chosen because the deliverable must hold up on a phone in
  a meeting, and scroll-scrubbed video at every section is where phone
  performance dies.
- **Design system: evolve, do not replace.** Tokens stay; composition changes.
- **Dependencies: native first.** Build the hero with CSS scroll-driven
  animation and `position: sticky`. Add GSAP ScrollTrigger only if native
  proves inadequate, with a demonstrated reason.

## Move 1 - Unwash the footage

### Local scrims instead of a blanket wash

Replace the three full-frame obscuring layers in `hero-backdrop.tsx` with a
scrim local to the type. A gradient sits behind the headline block only and
fades to transparent across the rest of the frame.

Result: footage reads at roughly 70-80% clarity instead of 15%. Faces become
visible. Headline contrast is unchanged, because the scrim is exactly where the
type is.

The existing playback gates stay as they are - reduced motion, small screens,
and save-data connections still get the still frame rather than the iframe.

### Route thumbnails through `next/image`

`next.config.ts` already declares `remotePatterns` for `i.ytimg.com` and
`yt3.ggpht.com`, but every image in the codebase uses a raw `<img>` tag:

- `src/app/page.tsx:431`
- `src/app/watch/archive/page.tsx:94,173,218`
- `src/app/watch/live/page.tsx:271`
- `src/components/hero-backdrop.tsx:69`

Converting these to `next/image` turns uncontrolled 480x360 `hqdefault.jpg`
frames into art-directed crops: tall portrait slots, wide cinematic bands,
square tiles. This is what makes "uncontrolled public imagery" safe to build a
visual system on - the source varies, the composition does not.

Verify the current `next/image` API against
`node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`
before writing code. This Next.js version has breaking changes from common
knowledge.

## Move 2 - Break the eleven-section grid

Replace uniform `Section` stacking with a five-type cadence, cycled rather than
repeated. Each type is a real, independently understandable component.

| Type | Character | Homepage sections |
|---|---|---|
| Full-bleed | Edge-to-edge photo, type overlaid | Hero, Explore the Center, Find Us |
| Narrow measure | ~62ch, generous margins, quiet | New Here, Together |
| Asymmetric split | 60/40 or 70/30, photo bleeding off one edge | Latest Teaching, Serve |
| Horizontal rail | Scrolling, cropped at the viewport edge | This Week, Communities |
| Overlap | Negative top margin, panel breaking the seam above | Next Up, Play at Centris |

Sections stop announcing themselves identically. Some crop at the edge, some
inset, some overlap the section above. Irregularity is the human signal.

This also resolves a structural problem: `page.tsx` currently defines eleven
inline section components in one 762-line file. Extracting the cadence types
into shared components is what allows the pattern to cascade to the remaining
routes without rewriting each one from scratch.

### Component boundaries

Each cadence type answers: what does it do, how is it used, what does it
depend on.

- Takes content as children and a small typed props surface (eyebrow, title,
  lead, action) mirroring the existing `SectionHead` contract.
- Depends only on design tokens and `Container`. No data fetching, no
  knowledge of which page renders it.
- Can be swapped for another cadence type at a call site without touching the
  content inside it.

`Section` and `SectionHead` in `src/components/ui.tsx` remain for routes not
yet migrated, so the cascade can proceed route by route without a flag day.

## Move 3 - One cinematic moment

### The hero sequence

A pinned scroll sequence resolving in place over roughly 150vh of scroll:

1. **Entry** - full-bleed CCF worship footage; wordmark and "CCF Centris" at
   `display-xl` scale.
2. **Scrub** - on scroll, the video scales down as the paper panel rises over
   it; the headline breaks into lines that settle at staggered rates.
3. **Handoff** - the panel locks, the video parks as a bordered inset, the
   live/next-service module resolves into place, and normal document scroll
   resumes.

### Implementation approach

Native first: CSS scroll-driven animations (`animation-timeline`, `view()`,
`scroll()`) with `position: sticky` for the pin. Tailwind 4.3.3 does not ship
utilities for these, so they belong in `globals.css` alongside the existing
`rail`, `pulse-dot`, and `rise` keyframes.

Add GSAP ScrollTrigger only if native proves inadequate - specifically if
Safari support or scrub quality fails in real testing. That decision needs
evidence, not anticipation.

### Mobile floor - non-negotiable

On phones and under `prefers-reduced-motion`, the sequence resolves instantly
to its final composed frame: an art-directed still that never had motion. Not
a degraded fallback - a designed end state.

`hero-backdrop.tsx` already gates on reduced motion, viewport width, and
save-data. That same gate extends to cover the scrub.

The success criterion is explicit: **the hero must paint fast and hold still on
a mid-range phone over conference wifi.** If the sequence cannot meet that, the
sequence is wrong, not the constraint.

### Below the hero

Editorial reveals only, all native:

- Staggered `rise` on intersection, via `IntersectionObserver`.
- Hover states with weight - real transitions on scale and shadow, not colour
  swaps alone.
- Parallax offsets between paper and photo layers, driven by CSS scroll
  timelines where supported and static where not.

## Explicitly out of scope

- **No dark mode.** `globals.css` states the system is built on paper and a
  dark inversion would fight it. Photo sections get dark *grounds*; the site
  does not get a dark *theme*.
- **No new typefaces.** Fraunces and Montserrat work. The problem is
  composition, not letterforms.
- **No new texture devices.** Tape and halftone stay and are used less. The
  current failure is ornament-over-grid; adding ornaments worsens it.
- **No photography that CCF has not published.**
- **No changes to data flow.** `src/lib/queries.ts` remains the single seam.
  This is a presentation-layer redirection only.

## Success criteria

1. A visitor sees real faces of real CCF people within the first viewport.
2. No two consecutive homepage sections share a cadence type.
3. The hero sequence runs at a steady frame rate on desktop and resolves
   instantly to a composed still on mobile and under reduced motion.
4. No new runtime dependency is added unless native implementation has been
   attempted and demonstrably failed.
5. `npm run typecheck` and `npm run build` pass; all 138 routes still build.
6. The cadence components are reusable on other routes without modification.

## Open questions

None blocking. The native-versus-GSAP decision is deliberately deferred to
implementation, resolved by testing rather than by guessing.
