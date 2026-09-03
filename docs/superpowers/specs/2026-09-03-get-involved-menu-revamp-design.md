# Get Involved mega-menu revamp

**Date:** 2026-09-03
**Status:** Designed, pending implementation

## Problem

The "Get Involved" mega-menu panel carries **13 links in one flat grid** —
Find a Dgroup, How Dgroups work, six life-stage communities (NXTGEN, Elevate,
B1G, Women, Men, Sports), Discipleship journey, GLC classes, Know Jesus,
Serve & volunteer, Missions. It has no internal structure, so it reads as a
wall of text and is heavy for a nav bar. The other three menus (Visit, Watch,
Centris) carry 4-6 items each and scan fine.

## Decision

Keep the group at four top-level doors (Visit / Watch / Get Involved /
Centris — unchanged from the earlier nav simplification). Do **not** split
"Get Involved" into a 5th top-level group. Instead:

1. Give the mega-panel **internal sub-groups** with labelled headings.
2. Cut the menu from 13 links to **8**, in **2 sections**, by making
   `/communities` the single door to the six life-stage community pages
   instead of listing all six in the menu.

## Change 1 — `NavGroup` gains an optional `sections` field

`src/lib/nav.ts`:

```ts
export interface NavSection {
  label: string;      // "Start here", "Go deeper"
  items: NavItem[];
}

export interface NavGroup {
  label: string;
  href: string;
  items: NavItem[];         // flat union of all links — mobile + fallback
  sections?: NavSection[];  // desktop panel uses this when present
}
```

- `items` stays as the **flat list of every link in the group**. The mobile
  sheet keeps iterating `items` unchanged, so mobile needs no structural
  change.
- `sections` is a desktop-only structured view. Only "Get Involved" sets it.
  Visit / Watch / Centris leave it undefined and render exactly as today.

## Change 2 — "Get Involved" data: 13 links -> 8, in 2 sections

| Section | Link | href | blurb |
|---|---|---|---|
| **Start here** | Find a Dgroup | `/grow/find-a-dgroup` | Search by day and life stage |
| **Start here** | Communities | `/communities` | NXTGEN, Elevate, B1G, Women, Men, Sports |
| **Start here** | Know Jesus | `/know-jesus` | Where following Him begins |
| **Go deeper** | How Dgroups work | `/grow/join-a-dgroup` | What to expect in a group |
| **Go deeper** | Discipleship journey | `/grow/journey` | The path from your first step |
| **Go deeper** | GLC classes | `/grow/glc` | Go deeper in the Word |
| **Go deeper** | Serve & volunteer | `/serve` | Find a place on a team |
| **Go deeper** | Missions | `/serve/missions` | Beyond Quezon City |

- **New menu link:** `Communities -> /communities`. That page already exists
  and renders all six community cards in a grid plus a "Communities gather,
  Dgroups grow" explainer. The six `/communities/[slug]` pages stay live and
  are reached from that grid.
- **Dropped from the menu** (pages NOT deleted): NXTGEN, Elevate, B1G, Women,
  Men, Sports as individual menu entries.
- `group.items` for "Get Involved" becomes the flat concatenation of both
  sections' items (8 entries), in the order above.
- `group.href` stays `/grow`.

## Change 3 — Desktop panel renders sections

`src/components/site-header.tsx`, the desktop mega panel's right column:

- **When `group.sections` is set:** render a `sm:grid-cols-2` grid, one cell
  per section. Each cell is a `<div>` containing:
  - a small uppercase heading — `<p className="label text-clay">` — with the
    section label (same treatment as the existing `group.label` eyebrow on
    the left).
  - a single-column `<ul>` of that section's links, using the **existing**
    link markup verbatim (`border-b border-hairline py-3`, semibold label
    that goes clay on hover, `text-ink-mute` blurb line).
- **When `group.sections` is absent:** the current
  `grid gap-x-8 gap-y-1 sm:grid-cols-2 xl:grid-cols-3` flat `<ul>` renders
  unchanged for Visit / Watch / Centris.
- The left column (clay eyebrow + `font-display text-3xl` `MENU_BLURB`) is
  untouched for all four groups. The `MENU_BLURB["Get Involved"]` string is
  unchanged.

## Mobile

No change. The mobile sheet renders one `<details>` per `NAV` group and
iterates `group.items`. "Get Involved" now has 8 items instead of 13, all
under the one disclosure. Section labels do not appear on mobile.

## Non-goals

- No change to Visit / Watch / Centris menus.
- No new top-level nav group.
- No route or page deletions; `/communities/[slug]` pages stay live.
- No change to persistent CTAs (Watch live, Plan your visit) or search.
- No change to `MENU_BLURB` copy.

## Verification

- `npm run build` — TypeScript passes, static pages generate.
- Manual: hover "Get Involved" on desktop -> two labelled columns
  ("Start here", "Go deeper"), 3 + 5 links. Hover Visit -> unchanged flat
  grid. Open mobile menu -> "Get Involved" lists the 8 links under one
  disclosure.
