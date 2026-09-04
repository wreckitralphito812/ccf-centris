# Nav dropdown redesign — contained, translucent, animated

**Date:** 2026-09-04
**Status:** Approved, ready for planning

## Problem

The desktop nav uses a full-bleed mega panel that spans the entire header
width for every menu. It reads as heavy and undifferentiated. The user wants
the Frontify-style pattern: a **contained** dropdown anchored under the nav, a
two-tone split (light primary list + dark "Featured" card), translucent
surfaces, and smooth open/close animation. The header bar itself becomes
floating rounded pills.

## Scope

In:

- `src/components/site-header.tsx` — desktop bar + dropdown rewrite, motion.
- `src/lib/nav.ts` — add optional `featured` field per group.
- Mobile sheet stays as-is structurally; only picks up the new pill styling
  where it already references header classes.

Out:

- No route changes. No new pages. No change to `NAV` group set or hrefs.
- Admin nav untouched.
- Search / Watch live / Service times actions keep their destinations.

## Data model change (`src/lib/nav.ts`)

Add an optional curated list to `NavGroup`:

```ts
export interface NavGroup {
  label: string;
  href: string;
  items: NavItem[];        // primary list, left side, name + blurb
  featured?: NavItem[];    // dark card, right side, name only (blurb ignored)
}
```

`items` becomes the **left** list (trimmed to the 4–6 that belong there).
`featured` becomes the **right** dark card (name only, no description).
Hand-pick per group:

| Group   | Left (`items`)                                                        | Featured (right)                                             |
|---------|---------------------------------------------------------------------|-------------------------------------------------------------|
| Visit   | New here · Service times · Getting here & parking · Coming with kids · Common questions | — (no featured; render single-column light panel)          |
| Watch   | Watch live · Latest message · Messages & series · 4Ws guides       | — (single column)                                           |
| Connect | Find a Dgroup · How Dgroups work · Serve & volunteer · Missions    | NXTGEN · Elevate · B1G · Women · Men · Sports              |
| Grow    | Discipleship journey · GLC classes · Resources · Know Jesus · Intercede | 52-Week Scripture · Chronicle                          |
| Centris | Explore the center · Facilities · Reserve a space · Upcoming events | Play sports · Court availability                            |

When `featured` is absent or empty, the panel renders as a single light
column (no dark card), sized narrower.

## Layout

### Header bar — floating pills

- Header is `sticky top-0 z-50`, transparent background, padding
  `px-4 sm:px-6 pt-3` so pills float clear of the viewport edges.
- **Left pill:** `inline-flex items-center` containing the wordmark + desktop
  `<nav>`. `rounded-full bg-paper/80 backdrop-blur-md border border-hairline
  px-3 py-2 shadow-[0_8px_30px_-12px_rgba(23,21,15,0.25)]`.
- **Right pill:** the actions cluster (search, Watch live, Service times) in a
  matching `rounded-full bg-paper/80 backdrop-blur-md border border-hairline`
  container. On `< lg`, right pill collapses to the hamburger only.
- Active/hover trigger gets a soft filled chip
  (`rounded-full bg-ink/[0.06]`) like the reference's "Product" pill.
- Trigger shows a chevron that rotates 180° when its menu is open.
- When scrolled (`scrollY > 12`) the pills get a touch more shadow; no colour
  flip needed since they're already translucent.

`ChromeOffset` already measures header height dynamically — the taller
floating header needs no constant updates elsewhere.

### Dropdown panel

- Positioned `absolute` under the left pill, `left` aligned to the nav start
  (roughly under the wordmark), `top` just below the pill (`mt-2` from pill
  bottom). Not full width.
- Container: `rounded-2xl border border-hairline bg-paper-bright/80
  backdrop-blur-xl shadow-[0_24px_60px_-24px_rgba(23,21,15,0.45)]
  overflow-hidden`.
- Inner grid:
  - With `featured`: `grid-cols-[minmax(18rem,1fr)_minmax(16rem,20rem)]`.
    Left cell `p-6`. Right cell is the dark card.
  - Without `featured`: single column, `w-[22rem] p-6`.
- **Left list item:** `<Link>` block, `py-3`, bold `text-[0.95rem] text-ink`
  label on top, `text-[0.8rem] text-ink-mute` blurb under. Hover: label →
  `text-clay`, whole row background `bg-ink/[0.03] rounded-lg -mx-2 px-2`.
  No bottom borders (cleaner than current).
- **Dark featured card:** fills its grid cell, `bg-ink/90 backdrop-blur-sm
  text-paper-bright rounded-xl m-2 p-5`. Top row: a `size-1.5 rounded-full
  bg-paper-bright/70` dot + `label` eyebrow "Featured". Then a vertical list
  of `<Link>`s, `py-2`, `text-[0.95rem]`, hover → `text-paper-bright` from a
  slightly dimmed `text-paper-bright/80` resting state.

## Motion (`motion/react`, already a dependency)

- Wrap the panel in `<AnimatePresence>`; render when `open` is set.
- Panel variants:
  - `initial: { opacity: 0, y: -8, scale: 0.98 }`
  - `animate: { opacity: 1, y: 0, scale: 1 }`
  - `exit:    { opacity: 0, y: -6, scale: 0.985 }`
  - transition `{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }`; exit
    `{ duration: 0.13 }`. `transformOrigin: "top left"`.
- Chevron: `animate={{ rotate: open ? 180 : 0 }}`, spring
  `{ type: "spring", stiffness: 400, damping: 30 }`.
- Left list: `staggerChildren: 0.02` on a parent variant; each item
  `{ opacity: 0, y: 4 } → { opacity: 1, y: 0 }`, `duration: 0.15`. Dark card
  fades as one block (no per-item stagger).
- Cross-menu switch (hover Visit → Watch while open): keep the panel mounted,
  animate content swap with a keyed inner `motion.div` (`key={open}`) doing a
  120ms opacity/`y` crossfade so the container doesn't unmount/remount.
- **Reduced motion:** `useReducedMotion()` → collapse all variants to plain
  `opacity` 0/1 with `duration: 0.12`, no `y`, no `scale`, no stagger, no
  chevron spring (instant rotate).

## Interaction (unchanged logic, same handlers)

- Hover-intent open; 140ms close delay on mouse-leave (`closeTimer` ref stays).
- `onFocus` on a trigger opens its menu (keyboard).
- `Escape` closes; closing on route change (`usePathname` effect) stays.
- `aria-expanded` on triggers; panel gets `role="region"` +
  `aria-label={`${group.label} menu`}`.
- Trigger stays a `<Link href={group.href}>` — clicking the top-level label
  still navigates to the section index.

## Testing

- No unit tests exist for the header; it's presentational. Verification is
  manual via `npm run dev`:
  - Each of the 5 menus opens anchored under the pill, not full width.
  - Visit/Watch render single-column (no dark card); Connect/Grow/Centris
    render the two-tone split.
  - Open/close animates smoothly; hovering between two triggers crossfades
    content without a flash.
  - `prefers-reduced-motion` (DevTools rendering emulation) → fade only.
  - Keyboard: Tab to a trigger opens the menu, Escape closes, Enter on the
    trigger navigates.
  - Mobile (`< lg`) sheet unaffected.
- `npm run typecheck` and `npm run build` must pass (note: the tree already
  has unrelated pre-existing 4Ws type errors; this change must not add new
  ones in header/nav files).

## Risks

- Panel left-anchoring: the wordmark + nav are now inside a pill with its own
  padding; the panel must align to the nav's visual start, not the pill's
  outer edge. Measure against the pill, offset for its `px`.
- `backdrop-blur-xl` over the warm hero gradient can look muddy; if so, drop
  to `backdrop-blur-md` and raise panel opacity to `/90`.
- Long "Digital Asset Management"-style labels aren't a concern here (CCF
  labels are short), but the dark card should `whitespace-nowrap` off and
  wrap gracefully.
