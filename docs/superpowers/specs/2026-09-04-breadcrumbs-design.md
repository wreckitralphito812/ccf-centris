# Breadcrumbs — design

**Date:** 2026-09-04
**Status:** Approved (pending spec review)

## Problem

Deep pages on the CCF Centris site give no sense of where the visitor is in the
site hierarchy. A handful of detail pages carry a single hand-rolled "← All
messages" link inside a `<nav aria-label="Breadcrumb">`, which is mislabelled
(it is one link, not a trail) and inconsistent in tone and wording across
pages. Most nested pages have nothing.

Add a real breadcrumb trail — `Home › Section › … › Current page` — to the
deepest pages, as a single reusable component.

## Scope

### In scope — first pass (10 detail pages)

Every dynamic detail route (`[slug]` / `[id]`), 2+ levels deep. Nine of these
already have a fake "← back" link to **replace**; `communities/[slug]` has a
different existing pattern to fold in.

| Route | Trail (Home is prepended by the component) | Tone | Existing back-link to remove |
|---|---|---|---|
| `/watch/messages/[slug]` | Watch › Messages › *{title}* | dark | `← All messages` |
| `/watch/4ws/[slug]` | Watch › 4Ws Guides › *{title}* | light | `← All 4Ws` |
| `/watch/archive/[id]` | Watch › Sunday Archive › *{title}* | dark | `← Sunday archive` |
| `/watch/series/[slug]` | Watch › Series › *{title}* | light | `← All series` |
| `/watch/speakers/[slug]` | Watch › Speakers › *{name}* | light | `← All speakers` |
| `/events/[slug]` | Events › *{title}* | light | `← All events` |
| `/serve/[slug]` | Serve › *{role}* | light | `← All roles` |
| `/centris/facilities/[slug]` | Centris › Facilities › *{name}* | light | `← All facilities` |
| `/grow/find-a-dgroup/[id]` | Grow › Find a Dgroup › *{name}* | light | `← All Dgroups` |
| `/communities/[slug]` | Communities › *{name}* | light | existing filter/meta `<Container>` row — leave it, add breadcrumb above `PageHeader` |

"Tone" = whether the breadcrumb sits on a dark section (`Section tone="ink"` /
`PageHeader tone="ink"`) or a light one. Drives the `tone` prop.

### Out of scope

- Home (`/`) and all top-level pages (`/about`, `/giving`, `/watch`, `/grow`, …).
- Section sub-pages exactly one level deep (`/watch/messages`, `/grow/glc`,
  `/visit/faqs`, …). The "2+ levels deep" rule excludes them; revisit later if
  wanted.
- All of `/admin/*` (separate layout and navigation).
- Auto-deriving trails from the URL path. Each page passes its trail explicitly.

## Component

### File

`src/components/breadcrumbs.tsx` — server component, no client JS.

### API

```tsx
export type Crumb = { label: string; href?: string };

export function Breadcrumbs({
  items,
  tone = "light",
  className,
}: {
  /** The trail *below* Home. Home is prepended automatically. The last item
   *  is the current page: pass it with no `href` so it renders as plain text. */
  items: Crumb[];
  tone?: "light" | "dark";
  className?: string;
}): JSX.Element
```

### Behaviour

- Prepends `{ label: "Home", href: "/" }` to `items`. Callers never pass Home.
- Renders `<nav aria-label="Breadcrumb"><ol>`. Each crumb is an `<li>`.
  - Crumbs with `href` → `<Link>`.
  - The final crumb (always) renders as `<span aria-current="page">`, ignoring
    any `href` it was given, with a slightly stronger colour than the links.
- Separator between crumbs: `›` (U+203A) in a `<span aria-hidden>`, muted.
- Type: the site's `.label` utility (uppercase, letter-spaced, small).
- Colour by tone:
  - `light`: links `text-ink-mute hover:text-clay`, current `text-ink`.
  - `dark`: links `text-paper-bright/50 hover:text-paper-bright`, current
    `text-paper-bright`.
  - `transition-colors` on links.
- Layout: `flex flex-wrap items-center gap-x-2 gap-y-1`. The current crumb gets
  `truncate max-w-[16rem]` so a long message title never blows out the row;
  earlier crumbs are short section names and are not truncated.
- `className` is merged onto the `<nav>` (callers pass `mb-6` / `mb-8`).

### JSON-LD

The component also renders a `<script type="application/ld+json">` with a
schema.org `BreadcrumbList`, built from the same `items` (Home included).
`itemListElement` entries use absolute URLs built from `SITE.url`
(`src/lib/site.ts`), joined with each crumb's `href`. The final crumb is
included as the last position with no `item` URL. This matches the existing
JSON-LD pattern on `/watch/messages/[slug]` and the site `Organization`
JSON-LD already in `site.ts`.

## Integration per page

For each of the 10 pages:

1. Remove the existing `<nav aria-label="Breadcrumb">…← back…</nav>` block (or,
   for `communities/[slug]`, add the new block without disturbing the existing
   meta row).
2. Add `<Breadcrumbs items={[…]} tone={…} className="mb-6|mb-8" />` as the
   first child of the first content `<Container>` (the same spot the old
   back-link occupied). Keep whichever `mb-*` the page already used.
3. Pass `tone="dark"` for `/watch/messages/[slug]` and `/watch/archive/[id]`;
   `tone="light"` for the rest.
4. Use the real resolved entity for the final label (`m.title`, `c.name`,
   `role.title`, …) — never the raw slug.

Section-name labels and hrefs (stable, hardcoded per page):

- Watch → `/watch`; Messages → `/watch/messages`; 4Ws Guides → `/watch/4ws`;
  Sunday Archive → `/watch/archive`; Series → `/watch/series`;
  Speakers → `/watch/speakers`
- Events → `/events`
- Serve → `/serve`
- Centris → `/centris`; Facilities → `/centris/facilities`
- Grow → `/grow`; Find a Dgroup → `/grow/find-a-dgroup`
- Communities → `/communities`

## Testing

- **Component test** (`src/components/breadcrumbs.test.tsx`, matching the
  project's existing test setup):
  - Home is prepended and links to `/`.
  - Non-final crumbs with `href` render as links; the final crumb renders as
    text with `aria-current="page"` even if given an `href`.
  - `tone="dark"` applies the dark colour classes.
  - A `BreadcrumbList` JSON-LD script is emitted with the right number of
    `itemListElement` positions.
- **Manual check**: one dark page (`/watch/messages/[slug]`) and one light
  (`/centris/facilities/[slug]`) — trail correct, wraps cleanly on a narrow
  viewport, long title truncates.
- `npm run typecheck` and `npm run build` pass (note: the tree currently has
  pre-existing `four-ws-guide` type errors unrelated to this work; this change
  must not add new ones).

## Non-goals / YAGNI

- No per-crumb icons.
- No "collapse middle crumbs on mobile" behaviour — `flex-wrap` + truncation
  is enough at these trail depths (≤ 4).
- No automatic path-based generation.
- No breadcrumbs on section index or top-level pages in this pass.
