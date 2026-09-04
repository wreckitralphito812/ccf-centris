# components/ui

Primitives in this folder are **shadcn/ui-derived, re-themed for CCF Centris**.

- They use `cn()` from `@/lib/utils` (clsx + tailwind-merge).
- Colours are CCF tokens (`bg-clay`, `text-ink`, `border-hairline`, …), not
  shadcn's `hsl(var(--*))` convention. This repo is Tailwind v4 with the theme
  in `src/app/globals.css` (`@theme inline`) and **no `tailwind.config.ts`**.
- The focus ring comes from the global `:focus-visible` rule in `globals.css`;
  components here do not add `focus-visible:ring-*`.
- `.btn-press` on button-shaped elements lifts them above the grain layer.

`../ui.tsx` is the **ergonomic wrapper layer**: `Button`, `ButtonLink`, `Pill`,
`Card`, `LinkCard` re-export these primitives with the site's historic prop
names (`tone`, `size`, `full`). Call sites import from `@/components/ui`, not
from this folder.

## Adding a new primitive

1. `npx shadcn@latest add <name>` (writes here via `components.json`).
2. Rewrite the file: strip `hsl(var(--*))` / `bg-background` etc., swap in CCF
   tokens, drop `focus-visible:ring-*`, keep `.btn-press` if it's a control.
3. If callers need the historic prop surface, add a wrapper in `../ui.tsx`.
