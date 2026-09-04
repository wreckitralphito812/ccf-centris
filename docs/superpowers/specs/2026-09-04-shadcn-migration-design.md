# shadcn/ui migration — design

**Date:** 2026-09-04
**Status:** Draft — pending user review

## Goal

Adopt shadcn/ui as the source for the site's generic UI primitives, so future
components are built the shadcn way and contributors get a familiar API.
Preserve the CCF Centris visual system exactly — same palette, type, texture,
spacing. No visual regression is acceptable.

## The constraint that shapes everything: Tailwind v4, no config file

This project runs **Tailwind CSS v4**:

- `src/app/globals.css` starts with `@import "tailwindcss";`
- Theme is defined with `@theme inline { --color-*: var(--token) }` — there is
  **no `tailwind.config.ts`**
- Custom variant `@custom-variant hover { @media (hover:hover) … }` gates every
  `hover:` utility (touch devices don't get sticky hover)
- Colour tokens are plain hex CSS custom properties (`--paper: #f6f0e4`,
  `--clay: #007682`, …), **not** the shadcn `hsl(var(--x))` channel convention
- Custom utilities live in `globals.css` as real classes: `.label`,
  `.display-xl/lg/md`, `.brand-face`, `.font-display`, `.font-script`,
  `.tabular`, `.halftone`, `.prose-links`
- Global element rules: `* { border-color: var(--hairline) }`, a fixed grain
  `body::before`, `.btn-press { z-index:4; isolation:isolate }` to lift
  controls above the grain, bespoke `:focus-visible` rings

Stock shadcn assumes Tailwind v3: a `tailwind.config.ts` with a `theme.extend`
block, `hsl(var(--background))` colours, `tailwindcss-animate`. Its `init` and
its component templates are written for that. We therefore **do not run
`shadcn init` in its default mode** and **do not adopt the shadcn colour-channel
theme**. We take shadcn component *source* and adapt it to this project's
existing v4 theme by hand.

### Decision: vendor, don't `init`

- Add `components.json` manually (style `new-york`, `rsc: true`, `tailwind.css`
  → `src/app/globals.css`, `aliases` → `@/components`, `@/lib/utils`,
  `iconLibrary`: keep none — the site has its own `icons.tsx`).
- `shadcn add <component>` can then pull sources into `src/components/ui/`, but
  **every added file is reviewed and edited** before it is used: strip the
  `hsl(var(--*))` classes, swap in the CCF tokens (`bg-clay`, `text-ink`,
  `border-hairline`, …), keep `.btn-press` on anything button-shaped, keep the
  bespoke focus ring (remove shadcn's `focus-visible:ring-*` in favour of the
  global `:focus-visible` rule already in `globals.css`, unless a component
  genuinely needs a component-scoped ring).
- If a component's only real value is structure we already have (Section,
  Container), we do **not** add it.

### `cn` vs `cx`

`ui.tsx` exports `cx(...parts)` — a plain `filter(Boolean).join(" ")`, no
`tailwind-merge`. shadcn components call `cn()` and rely on `twMerge` for
conflicting-class resolution.

**Decision:** add `clsx` + `tailwind-merge`, create `src/lib/utils.ts` with the
standard `cn`. Keep `cx` too (re-export `cn` as `cx` from `ui.tsx`, or leave
`cx` as-is and let both exist). Existing call sites keep using `cx`; new shadcn
components use `cn`. Not worth a 70-file `cx`→`cn` sweep.

## Component inventory & disposition

Usage counts = files referencing the identifier (`grep -rl`, `src/app` +
`src/components`).

### Migrate to shadcn

| Current | Uses | shadcn target | Notes |
|---|---:|---|---|
| `Button` (`ui.tsx`) | 9 | `Button` | 3 sizes, **8 tones**: `primary ink outline ghost sky on-dark outline-on-dark ghost-on-dark`. Map tones → shadcn `variant`s (`default`, plus custom variants added to the CVA config). Keep `full` prop → `w-full`. Keep `.btn-press`. |
| `ButtonLink` (`ui.tsx`) | 42 | `Button` + `asChild` wrapping `next/link` | shadcn pattern is `<Button asChild><Link/></Button>`. We keep a `ButtonLink` wrapper with the identical prop surface so 42 call sites do **not** change. |
| `Pill` (`ui.tsx`) | 21 | `Badge` | 6 tones: `default clay sky moss live muted`. Map → Badge `variant`s via CVA. Keep `Pill` name as a wrapper or rename with a codemod — **decision below**. |
| `Card` / `LinkCard` (`ui.tsx`) | 3 / 1 | `Card` (+ `CardHeader/Content/Footer` available but optional) | Low usage. `LinkCard` = `Card` rendered as `<Link>` with a border-hover; keep the wrapper. |
| `DetailRow` (`ui.tsx`) | 5 | keep bespoke, or shadcn `Table` | shadcn has no "spec row". **Decision:** leave `DetailRow` as-is; not a shadcn primitive. |
| `EmptyState` (`ui.tsx`) | 13 | keep bespoke | Composed pattern, not a shadcn primitive. Leave as-is. |

### Keep bespoke (no shadcn equivalent — out of scope)

`Container` (55), `Section` (55), `Eyebrow` (21), `SectionHead` (28),
`PageHeader` (49), `Prose` (4), `BigNumeral` (1), `LiveDot` (3) — layout /
editorial primitives shadcn does not provide.

All of `cards.tsx` — `MessageCard`, `EventCard`, `ServiceRow`, `CommunityCard`,
`DgroupCard`, `FacilityCard`, `VolunteerCard`, `MessageArt` — domain
components. They may be refactored to compose the new shadcn `Card` internally
in a later pass, but that is **not** in this migration.

All of `motion.tsx` (11 exports) — animation wrappers on `motion` (Framer).
Untouched.

`icons.tsx`, `wordmark.tsx`, `hero-backdrop.tsx`, `youtube-*.tsx`,
`site-header.tsx`, `site-footer.tsx` — untouched except where they call
`Button`/`Pill`.

### The `tone` prop collision

`tone=` appears 246 times across the codebase on **six different components**
with **different value sets**:

- `Section`: `paper deep bright ink`
- `Button`: `primary ink outline ghost sky on-dark outline-on-dark ghost-on-dark`
- `Pill`: `default clay sky moss live muted`
- `Eyebrow` / `SectionHead` / `PageHeader`: `clay ink paper`

The migration must not conflate these. `Section`/`Eyebrow`/`SectionHead`/
`PageHeader` are **not** being migrated, so their `tone` prop is untouched.
Only `Button.tone` and `Pill.tone` change meaning — and only if we rename.
**Decision below** keeps `tone` on the wrappers to avoid a large codemod.

## Naming decision: keep wrappers, keep prop names

Two options for `Button` and `Pill`:

- **(A) Rename to shadcn API** — call sites become `<Button variant="outline">`,
  `<Badge variant="secondary">`. ~50 call sites edited, `Pill`→`Badge` rename
  across 21 files, `tone`→`variant` everywhere. Larger diff, larger regression
  surface, but "pure" shadcn.
- **(B) Keep `ButtonLink`/`Button`/`Pill` wrappers** over the shadcn core, with
  the **exact current prop surface** (`tone`, `size`, `full`). The shadcn
  `Button`/`Badge` (with CCF-token CVA variants) sit underneath; the wrapper
  maps `tone`→`variant`. **~0 call-site changes.** The primitives are shadcn;
  the ergonomic layer is ours.

**Recommendation: (B).** It gets the stated goal — shadcn primitives, shadcn
build conventions, `shadcn add` works for future components — without a
disruptive rename. Revisit (A) as a separate mechanical codemod later if
desired.

## Phased plan (each phase = one reviewable diff + checkpoint)

**Checkpoint** after every phase: `npm run typecheck` clean (modulo the known
pre-existing `four-ws-guide` errors), `npm run lint` no new warnings,
`npm run build` compiles, and a dev-server spot-check of 3–4 representative
pages (a light page, a dark `Section tone="ink"` page, a page with Pills, a
form page) — visually unchanged.

### Phase 0 — this spec
Write, self-review, user-review. No code.

### Phase 1 — foundation, no call-site changes
- Add deps: `clsx`, `tailwind-merge`, `class-variance-authority`. (No
  `tailwindcss-animate` — Tailwind v4 has the animation utilities built in;
  add only if a specific added component needs it.)
- `src/lib/utils.ts` → `cn`.
- `components.json` (manual, as above).
- No component added yet. Build must pass. Diff is ~4 files.

### Phase 2 — Button
- `shadcn add button`; rewrite `src/components/ui/button.tsx`:
  - CVA `variant` set = the 8 current tones, styled with CCF tokens copied
    verbatim from today's `TONE` map in `ui.tsx`.
  - `size` = `sm md lg` with today's exact padding/text values.
  - Root element keeps `btn-press` and the `inline-flex items-center …
    uppercase tracking-[0.1em]` base.
  - Drop shadcn's `focus-visible:ring` (global `:focus-visible` covers it).
- Re-export `Button`, `ButtonLink` from `ui.tsx` as thin wrappers over the new
  `ui/button` with the current prop surface (`tone`,`size`,`full`,`className`).
  `ButtonLink` = `<Button asChild><Link …/></Button>`.
- Delete the old inline `buttonClass`/`TONE`/`SIZE` from `ui.tsx`.
- **No call-site edits.** Checkpoint.

### Phase 3 — Pill → Badge
- `shadcn add badge`; rewrite `src/components/ui/badge.tsx` with CVA variants =
  the 6 current Pill tones, CCF tokens copied from today's `Pill` `tones` map.
- `Pill` in `ui.tsx` becomes a wrapper over `ui/badge` keeping `tone`.
- **No call-site edits.** Checkpoint.

### Phase 4 — Card / LinkCard
- `shadcn add card`; rewrite `src/components/ui/card.tsx` — base is just
  `border border-hairline bg-paper-bright`; keep it minimal, don't force
  `CardHeader/Content` on the 3 existing users.
- `Card`, `LinkCard` in `ui.tsx` become wrappers. `LinkCard` = card styles on
  `<Link>` with `hover:border-ink`.
- Update the ≤4 call sites only if the wrapper can't preserve behaviour.
  Checkpoint.

### Phase 5 — sweep & document
- Confirm `DetailRow`, `EmptyState`, `BigNumeral`, `LiveDot` untouched and
  still exported from `ui.tsx`.
- Add `src/components/ui/README` note: primitives in `ui/` are shadcn-derived
  and CCF-themed; `ui.tsx` is the ergonomic wrapper layer; run
  `shadcn add <x>` for new primitives then re-theme before use.
- Final full-site build + broad dev-server pass.

## Explicitly out of scope

- Renaming `tone`→`variant` at call sites (possible later codemod).
- Migrating `cards.tsx`, `motion.tsx`, `Section`, `Container`, `PageHeader`,
  `Eyebrow`, `SectionHead`.
- Dark mode / theme switching. The site is `color-scheme: light` by design
  (`globals.css` comment: "a dark inversion would fight it"). shadcn's
  `.dark` class variants are not wired up.
- `tailwind-merge` sweep of existing `cx` call sites.
- Any visual redesign. Pixel parity is the bar.

## Risks

1. **`shadcn add` writes v3-shaped files.** Mitigation: every added file is
   hand-edited in the same phase before anything imports it; Phase 1 proves the
   pipeline with zero components.
2. **`asChild` / Slot behaviour** for `ButtonLink` — Radix `Slot` merges props
   onto the child. Verify focus, `className` merge, and that `next/link`
   prefetch still works. Covered by the Phase 2 checkpoint (form pages + nav).
3. **`btn-press` stacking context** must remain on the actual rendered element,
   not a wrapper, or buttons sink under the grain. Explicit check in Phase 2.
4. **CVA variant name clashes** — don't name a variant `default` and also map a
   `tone` called `primary` to something else inconsistently. Keep the wrapper's
   `tone`→`variant` map 1:1 and total.
5. **Pre-existing red build.** The tree already has `four-ws-guide` type errors
   (unrelated WIP). Each checkpoint compares against that baseline, not zero.

## Success criteria

- `src/components/ui/{button,badge,card}.tsx` exist, are shadcn-derived, and
  render in CCF's palette.
- `components.json` present; `shadcn add` works for future components.
- `Button`, `ButtonLink`, `Pill`, `Card`, `LinkCard` keep their current
  import paths and prop surfaces — call sites unchanged.
- `npm run build` green (baseline-adjusted); representative pages visually
  identical before/after.
