# shadcn/ui Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled `Button`, `ButtonLink`, `Pill`, `Card`, `LinkCard` primitives with shadcn/ui-derived components, adapted to the project's existing Tailwind v4 theme, keeping every current import path and prop surface so no call sites change.

**Architecture:** Vendor shadcn component source by hand into `src/components/ui/` (not via `shadcn init` — this repo is Tailwind v4 with no config file, and shadcn's CLI emits v3-shaped files). Each vendored file is re-themed with CCF tokens (`bg-clay`, `text-ink`, `border-hairline`, …) copied verbatim from today's inline style maps. `src/components/ui.tsx` keeps thin wrappers (`Button`, `ButtonLink`, `Pill`, `Card`, `LinkCard`) over the new primitives, preserving the current `tone`/`size`/`full` props. `class-variance-authority` drives variant selection; a new `cn()` (clsx + tailwind-merge) is added for the vendored files while existing `cx()` stays.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (`@import "tailwindcss"`, `@theme inline`), TypeScript, `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot` (for `asChild`). Tests run under `tsx --test` (Node test runner) — logic only, no JSX rendering.

## Global Constraints

- **Tailwind v4, no config file.** Theme lives in `src/app/globals.css` via `@theme inline`. Do NOT create `tailwind.config.ts`. Do NOT adopt shadcn's `hsl(var(--x))` colour convention.
- **No `shadcn init`.** Vendor files manually. The `shadcn` CLI may be used for *future* components but is not part of this plan.
- **Zero call-site changes.** `Button`, `ButtonLink`, `Pill`, `Card`, `LinkCard` keep their current import path (`@/components/ui`) and exact prop surface (`tone`, `size`, `full`, `className`, `as`). If a wrapper can't preserve behaviour, stop and flag it — do not edit call sites without escalating.
- **Pixel parity.** No visual change. Every token string in the variant maps is copied verbatim from the current `src/components/ui.tsx`.
- **Keep `.btn-press`** on every button-shaped element (it lifts controls above the fixed grain `body::before`; losing it makes buttons look hollow).
- **Keep the global focus ring.** `globals.css` already has `:focus-visible { outline: 2px solid var(--focus) }`. Do NOT add shadcn's `focus-visible:ring-*` classes.
- **Light mode only.** No `.dark` variants. The site is `color-scheme: light` by design.
- **Baseline red build.** `npm run typecheck` already fails on pre-existing `four-ws-guide` / `FourWsGuideRecord` errors in `src/lib/content/parsers/four-ws-guide.ts`, `src/app/watch/4ws/[slug]/page.tsx`, and `src/app/page.tsx`. Each checkpoint compares against THAT baseline — no *new* errors, rather than zero errors.
- **Commit after every task.** Never use `--no-verify`. Do not add `Co-Authored-By` trailers is NOT in force here — this repo's commits DO end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` (that rule is Sip & Scale only). Use the trailer.
- **Branch.** Current branch is `main`. Create `shadcn-migration` before Task 1.

---

## File Structure

**Created:**
- `src/lib/utils.ts` — exports `cn(...)` (clsx + tailwind-merge). Used only by vendored `ui/*` files.
- `components.json` — shadcn manifest so future `shadcn add` works. Not consumed by this plan's code.
- `src/components/ui/button.tsx` — vendored+themed Button primitive: `buttonVariants` CVA + `Button` component with `asChild`. Exports `Button`, `buttonVariants`, `ButtonProps`.
- `src/components/ui/badge.tsx` — vendored+themed Badge primitive: `badgeVariants` CVA + `Badge` component. Exports `Badge`, `badgeVariants`, `BadgeProps`.
- `src/components/ui/card.tsx` — vendored+themed Card primitive. Exports `Card` (and unused-but-available `CardHeader`/`CardContent`/`CardFooter`/`CardTitle`/`CardDescription`).
- `src/components/ui/button-variants.test.ts` — asserts every `tone` maps to a non-empty variant class string.
- `src/components/ui/badge-variants.test.ts` — same for Badge.

**Modified:**
- `src/components/ui.tsx` — `Button`, `ButtonLink`, `Pill`, `Card`, `LinkCard` become wrappers over `ui/*`. Delete the inline `ButtonTone`/`ButtonSize` types, `TONE`, `SIZE`, `buttonClass`, and the inline `Pill` tone map / `Card` classes. Keep `cx`, `Container`, `Section`, `Eyebrow`, `SectionHead`, `DetailRow`, `EmptyState`, `BigNumeral`, `LiveDot` exactly as they are.
- `package.json` — add `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot` to `dependencies`.

**Untouched (explicitly out of scope):** `src/components/cards.tsx`, `src/components/motion.tsx`, `src/components/page-header.tsx`, `src/components/icons.tsx`, `src/components/breadcrumbs*.{tsx,ts}`, all route files under `src/app/`, `src/app/globals.css`.

---

## Task 1: Foundation — deps, `cn`, `components.json`

**Files:**
- Modify: `package.json` (dependencies block)
- Create: `src/lib/utils.ts`
- Create: `components.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `cn(...inputs: ClassValue[]): string` from `@/lib/utils` — used by all Task 2–4 vendored files.

- [ ] **Step 1: Install the four runtime deps**

Run:
```bash
git checkout -b shadcn-migration
npm install class-variance-authority@^0.7.1 clsx@^2.1.1 tailwind-merge@^2.6.0 @radix-ui/react-slot@^1.1.2
```
Expected: `package.json` `dependencies` gains the four packages; `npm install` exits 0. If exact versions 404, drop the caret pin and install latest (`npm install class-variance-authority clsx tailwind-merge @radix-ui/react-slot`).

- [ ] **Step 2: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class-name combiner for the vendored shadcn primitives in `components/ui/`.
 * `clsx` resolves conditionals; `twMerge` de-dupes conflicting Tailwind
 * utilities so a caller's `className` can override a variant's default.
 *
 * The rest of the codebase uses `cx` from `components/ui` (no tailwind-merge)
 * — that stays; this is additive.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```
Note: `tailwind.config: ""` is correct for v4. This file is a manifest for future `shadcn add`; nothing in this plan imports it.

- [ ] **Step 4: Verify the build still compiles**

Run: `npm run build 2>&1 | grep -iE "Compiled successfully|Failed|error TS" | head`
Expected: `✓ Compiled successfully`. No component changed yet, so this only proves the deps install cleanly.

- [ ] **Step 5: Verify typecheck baseline unchanged**

Run: `npm run typecheck 2>&1 | grep -c "error TS"`
Expected: the SAME count as before this task (the pre-existing `four-ws-guide` errors — record the number; it does not go up).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/utils.ts components.json
git commit -m "$(cat <<'EOF'
chore: shadcn foundation — cn(), deps, components.json

No components yet. Adds class-variance-authority, clsx, tailwind-merge,
@radix-ui/react-slot and src/lib/utils.ts cn(). components.json is a
manifest for future `shadcn add`; nothing consumes it yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Button primitive + wrappers

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/button-variants.test.ts`
- Modify: `src/components/ui.tsx` (replace the Button section, lines ~12–95)

**Interfaces:**
- Consumes: `cn` from `@/lib/utils` (Task 1).
- Produces:
  - From `@/components/ui/button`: `buttonVariants({ variant?, size?, full? })` — CVA fn returning a class string. `Button` — `React.forwardRef` over `<button>` accepting `variant`, `size`, `full`, `asChild`. Types `ButtonProps`.
  - From `@/components/ui` (unchanged signatures): `Button({ tone?, size?, full?, className, ...buttonProps })` and `ButtonLink({ tone?, size?, full?, className, href, ...linkProps })`. `tone` values: `"primary" | "ink" | "outline" | "ghost" | "sky" | "on-dark" | "outline-on-dark" | "ghost-on-dark"` (default `"primary"`). `size`: `"sm" | "md" | "lg"` (default `"md"`).

- [ ] **Step 1: Write the failing test**

`src/components/ui/button-variants.test.ts`:
```ts
import assert from "node:assert/strict";
import test from "node:test";

import { buttonVariants, TONES } from "./button";

test("every tone produces a non-empty class string", () => {
  for (const tone of TONES) {
    const cls = buttonVariants({ variant: tone });
    assert.equal(typeof cls, "string");
    assert.ok(cls.length > 0, `tone ${tone} yielded empty class`);
  }
});

test("the primary tone carries the clay background", () => {
  assert.match(buttonVariants({ variant: "primary" }), /bg-clay\b/);
});

test("outline-on-dark keeps the cream border and text", () => {
  const cls = buttonVariants({ variant: "outline-on-dark" });
  assert.match(cls, /border-paper-bright/);
  assert.match(cls, /text-paper-bright/);
});

test("size lg carries the responsive padding step", () => {
  assert.match(buttonVariants({ size: "lg" }), /sm:px-7/);
});

test("full adds w-full", () => {
  assert.match(buttonVariants({ full: true }), /w-full/);
});

test("base always includes btn-press", () => {
  assert.match(buttonVariants({}), /btn-press/);
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx tsx --test "src/components/ui/button-variants.test.ts"`
Expected: FAIL — `Cannot find module './button'`.

- [ ] **Step 3: Create `src/components/ui/button.tsx`**

Token strings below are copied verbatim from the current `TONE` and `SIZE` maps in `src/components/ui.tsx`.

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Button, re-themed for CCF Centris.
 *
 * `variant` = the site's button tones (see the comment block that used to
 * live in ui.tsx): `-on-dark` tones are for sections over --night or photos;
 * they exist as real variants, not className overrides, because an override
 * of equal specificity loses to the variant depending on stylesheet order
 * and silently produced cream-on-cream buttons.
 *
 * The global `:focus-visible` rule in globals.css supplies the focus ring —
 * no `focus-visible:ring-*` here. `.btn-press` lifts the control above the
 * fixed grain `body::before`.
 */
export const TONES = [
  "primary",
  "ink",
  "outline",
  "ghost",
  "sky",
  "on-dark",
  "outline-on-dark",
  "ghost-on-dark",
] as const;

export type ButtonTone = (typeof TONES)[number];

export const buttonVariants = cva(
  "btn-press inline-flex items-center justify-center gap-2 border font-semibold uppercase tracking-[0.1em] transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-clay text-paper-bright border-clay hover:bg-clay-deep hover:border-clay-deep",
        ink: "bg-ink text-paper-bright border-ink hover:bg-night hover:border-night",
        outline:
          "bg-transparent text-ink border-ink hover:bg-ink hover:text-paper-bright",
        ghost:
          "bg-transparent text-ink border-transparent hover:border-ink/30 hover:bg-ink/5",
        sky: "bg-sky text-paper-bright border-sky hover:brightness-110",
        "on-dark":
          "bg-paper-bright text-night border-paper-bright hover:bg-bone hover:border-bone",
        "outline-on-dark":
          "bg-transparent text-paper-bright border-paper-bright hover:bg-paper-bright hover:text-night",
        "ghost-on-dark":
          "bg-transparent text-paper-bright border-transparent hover:border-paper-bright/40 hover:bg-paper-bright/10",
      },
      size: {
        sm: "px-3.5 py-1.5 text-[0.78rem]",
        md: "px-5 py-2.5 text-[0.86rem]",
        lg: "px-5 py-3 text-[0.9rem] sm:px-7 sm:py-3.5 sm:text-[0.95rem]",
      },
      full: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      full: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, full }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
```

- [ ] **Step 4: Run the test, expect pass**

Run: `npx tsx --test "src/components/ui/button-variants.test.ts"`
Expected: PASS, 6 tests.

- [ ] **Step 5: Rewrite the Button section of `src/components/ui.tsx`**

Replace everything from `/* --- Button ... */` down to the end of `ButtonLink` (the `ButtonTone` type, `ButtonSize` type, `TONE`, `SIZE`, `buttonClass`, `Button`, `ButtonLink`) with:

```tsx
/* --- Button -------------------------------------------------------------- */

/* The primitive lives in ./ui/button (shadcn-derived, CCF-themed). These
   wrappers keep the historic prop surface — `tone` (not `variant`), `size`,
   `full` — so call sites are unchanged. */

import {
  Button as ButtonBase,
  type ButtonTone,
  buttonVariants,
} from "./ui/button";

type ButtonSize = "sm" | "md" | "lg";

export function Button({
  tone = "primary",
  size = "md",
  full,
  className,
  ...rest
}: ComponentProps<"button"> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  full?: boolean;
}) {
  return (
    <ButtonBase
      variant={tone}
      size={size}
      full={full}
      className={className}
      {...rest}
    />
  );
}

export function ButtonLink({
  tone = "primary",
  size = "md",
  full,
  className,
  ...rest
}: ComponentProps<typeof Link> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  full?: boolean;
}) {
  return (
    <Link
      className={cx(buttonVariants({ variant: tone, size, full }), className)}
      {...rest}
    />
  );
}
```

Notes for the implementer:
- Keep the existing `import Link from "next/link";` and `import type { ComponentProps, ReactNode } from "react";` at the top of `ui.tsx`.
- `ButtonLink` uses `buttonVariants(...)` + `cx` directly rather than `<ButtonBase asChild><Link/></ButtonBase>` — simpler, avoids Slot ref-forwarding edge cases with `next/link`, and produces byte-identical classes.
- `cx` is still defined in this file; leave it.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck 2>&1 | grep "error TS" | grep -v "four-ws-guide" | grep -vE "page.tsx\(46[579]|page.tsx\(470|4ws/\[slug\]/page.tsx\(8[89]|4ws/\[slug\]/page.tsx\(9[0-4]" || echo "NO NEW ERRORS"`
Expected: `NO NEW ERRORS`.

- [ ] **Step 7: Build**

Run: `npm run build 2>&1 | grep -iE "Compiled successfully|Failed|error" | head`
Expected: `✓ Compiled successfully`.

- [ ] **Step 8: Visual spot-check**

Run:
```bash
(npm run dev > /tmp/dev.log 2>&1 &) ; sleep 9
curl -s http://localhost:3000/ | grep -o 'class="btn-press[^"]*"' | head -3
curl -s http://localhost:3000/watch | grep -o 'class="btn-press[^"]*"' | head -3
taskkill //F //IM node.exe 2>/dev/null || pkill -f "next dev" || true
```
Expected: button class strings include `bg-clay text-paper-bright border-clay` (primary) and, on dark sections, `bg-paper-bright text-night` (`on-dark`) — i.e. the SAME strings the old `buttonClass` produced. If any button renders with no background/border classes, the `tone`→`variant` map has a gap — fix before committing.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/button-variants.test.ts src/components/ui.tsx
git commit -m "$(cat <<'EOF'
refactor: Button on shadcn primitive (ui/button)

CVA buttonVariants carries the 8 CCF tones verbatim; ui.tsx keeps
Button/ButtonLink wrappers with the tone/size/full prop surface, so no
call sites change. Global :focus-visible ring kept; .btn-press kept.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Badge primitive + `Pill` wrapper

**Files:**
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/badge-variants.test.ts`
- Modify: `src/components/ui.tsx` (replace the `Pill` function)

**Interfaces:**
- Consumes: `cn` from `@/lib/utils` (Task 1).
- Produces:
  - From `@/components/ui/badge`: `badgeVariants({ variant? })`, `Badge` (`<span>` + `variant`), `PILL_TONES` tuple, `BadgeProps`.
  - From `@/components/ui` (unchanged): `Pill({ children, tone?, className })` — `tone`: `"default" | "clay" | "sky" | "moss" | "live" | "muted"` (default `"default"`).

- [ ] **Step 1: Write the failing test**

`src/components/ui/badge-variants.test.ts`:
```ts
import assert from "node:assert/strict";
import test from "node:test";

import { badgeVariants, PILL_TONES } from "./badge";

test("every pill tone produces a non-empty class string", () => {
  for (const tone of PILL_TONES) {
    const cls = badgeVariants({ variant: tone });
    assert.ok(cls.length > 0, `tone ${tone} yielded empty class`);
  }
});

test("clay tone keeps the tinted fill and deep text", () => {
  const cls = badgeVariants({ variant: "clay" });
  assert.match(cls, /bg-clay\/10/);
  assert.match(cls, /text-clay-deep/);
});

test("live tone is the solid clay chip", () => {
  assert.match(badgeVariants({ variant: "live" }), /bg-clay\b/);
});

test("base always includes the label utility and border box", () => {
  const cls = badgeVariants({});
  assert.match(cls, /\blabel\b/);
  assert.match(cls, /border px-2\.5 py-1/);
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx tsx --test "src/components/ui/badge-variants.test.ts"`
Expected: FAIL — `Cannot find module './badge'`.

- [ ] **Step 3: Create `src/components/ui/badge.tsx`**

Token strings copied verbatim from the current `Pill` `tones` map in `ui.tsx`.

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Badge, re-themed for CCF Centris. This is the primitive behind
 * `Pill` in components/ui.tsx. `.label` is the site's uppercase tracked
 * micro-type utility from globals.css.
 */
export const PILL_TONES = [
  "default",
  "clay",
  "sky",
  "moss",
  "live",
  "muted",
] as const;

export type PillTone = (typeof PILL_TONES)[number];

export const badgeVariants = cva(
  "label inline-flex items-center gap-1.5 border px-2.5 py-1",
  {
    variants: {
      variant: {
        default: "border-ink/25 text-ink",
        clay: "border-clay/40 bg-clay/10 text-clay-deep",
        sky: "border-sky/40 bg-sky/10 text-sky",
        moss: "border-moss/40 bg-moss/10 text-moss",
        live: "border-transparent bg-clay text-paper-bright",
        muted: "border-transparent bg-ink/8 text-ink-mute",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
```

- [ ] **Step 4: Run the test, expect pass**

Run: `npx tsx --test "src/components/ui/badge-variants.test.ts"`
Expected: PASS, 4 tests.

- [ ] **Step 5: Rewrite `Pill` in `src/components/ui.tsx`**

Replace the entire `export function Pill({ ... }) { ... }` block with:

```tsx
export function Pill({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: import("./ui/badge").PillTone;
  className?: string;
}) {
  return (
    <Badge variant={tone} className={className}>
      {children}
    </Badge>
  );
}
```

And add to the imports near the top of `ui.tsx`:
```tsx
import { Badge } from "./ui/badge";
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck 2>&1 | grep "error TS" | grep -v "four-ws-guide" | grep -vE "page.tsx\(46[579]|page.tsx\(470|4ws/\[slug\]/page.tsx\(8[89]|4ws/\[slug\]/page.tsx\(9[0-4]" || echo "NO NEW ERRORS"`
Expected: `NO NEW ERRORS`.

- [ ] **Step 7: Build**

Run: `npm run build 2>&1 | grep -iE "Compiled successfully|Failed|error" | head`
Expected: `✓ Compiled successfully`.

- [ ] **Step 8: Visual spot-check**

Run:
```bash
(npm run dev > /tmp/dev.log 2>&1 &) ; sleep 9
curl -s http://localhost:3000/grow/find-a-dgroup | grep -o 'class="label inline-flex[^"]*"' | head -5
taskkill //F //IM node.exe 2>/dev/null || pkill -f "next dev" || true
```
Expected: pill class strings match the old output — e.g. `label inline-flex items-center gap-1.5 border px-2.5 py-1 border-clay/40 bg-clay/10 text-clay-deep`.

- [ ] **Step 9: Commit**

```bash
git add src/components/ui/badge.tsx src/components/ui/badge-variants.test.ts src/components/ui.tsx
git commit -m "$(cat <<'EOF'
refactor: Pill on shadcn Badge primitive (ui/badge)

badgeVariants carries the 6 CCF pill tones verbatim; Pill stays a wrapper
keeping its tone prop. No call sites change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Card primitive + `Card` / `LinkCard` wrappers

**Files:**
- Create: `src/components/ui/card.tsx`
- Modify: `src/components/ui.tsx` (replace `Card` and `LinkCard`)

**Interfaces:**
- Consumes: `cn` from `@/lib/utils` (Task 1).
- Produces:
  - From `@/components/ui/card`: `Card` (`<div>` with the base border/bg), plus `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` (available for future use, not consumed here).
  - From `@/components/ui` (unchanged): `Card({ children, className, as? })` — `as`: `"div" | "article" | "li"` (default `"div"`); `LinkCard({ href, children, className })`.

There is no logic to unit-test here (pure presentational class strings, no variant selection). Skip the test-first cycle for this task; the build + visual check is the gate. This is a deliberate right-sizing call, not an omission.

- [ ] **Step 1: Create `src/components/ui/card.tsx`**

Base class copied verbatim from the current `Card` in `ui.tsx`.

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Card, re-themed for CCF Centris — the primitive behind `Card`
 * and `LinkCard` in components/ui.tsx. The sub-parts (Header/Title/…) are
 * provided for future use; today's callers only use the shell.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border border-hairline bg-paper-bright transition-colors duration-200",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-display text-xl leading-tight", className)} {...props} />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-[0.95rem] text-ink-soft", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
```

- [ ] **Step 2: Rewrite `Card` and `LinkCard` in `src/components/ui.tsx`**

Replace both `export function Card(...)` and `export function LinkCard(...)` with:

```tsx
/* --- Surfaces --------------------------------------------------------------- */

import { Card as CardBase } from "./ui/card";

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}) {
  // CardBase renders a <div>; when the caller needs <article>/<li> we fall
  // back to a plain element with the same class so semantics are preserved.
  if (As === "div") {
    return <CardBase className={className}>{children}</CardBase>;
  }
  return (
    <As
      className={cx(
        "border border-hairline bg-paper-bright transition-colors duration-200",
        className,
      )}
    >
      {children}
    </As>
  );
}

/** Card that is entirely a link, with a hover lift on the border only. */
export function LinkCard({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "group block border border-hairline bg-paper-bright",
        "transition-colors duration-200 hover:border-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}
```

Implementer note: `LinkCard`'s classes are unchanged from today — it is NOT rewired through `CardBase` because `CardBase` is a `<div>` and this must be an `<a>`. Keeping it verbatim is intentional; the point of Task 4 is that `Card`'s shell now comes from `ui/card`.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck 2>&1 | grep "error TS" | grep -v "four-ws-guide" | grep -vE "page.tsx\(46[579]|page.tsx\(470|4ws/\[slug\]/page.tsx\(8[89]|4ws/\[slug\]/page.tsx\(9[0-4]" || echo "NO NEW ERRORS"`
Expected: `NO NEW ERRORS`.

- [ ] **Step 4: Build**

Run: `npm run build 2>&1 | grep -iE "Compiled successfully|Failed|error" | head`
Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Visual spot-check**

Run:
```bash
(npm run dev > /tmp/dev.log 2>&1 &) ; sleep 9
curl -s http://localhost:3000/grow/resources | grep -o 'border border-hairline bg-paper-bright[^"]*' | head -3
taskkill //F //IM node.exe 2>/dev/null || pkill -f "next dev" || true
```
Expected: the card shell class string is unchanged. Grep the three call sites (`grep -rl "\bCard\b\|LinkCard" src/app src/components --include="*.tsx"`) and eyeball each rendered page if practical.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/card.tsx src/components/ui.tsx
git commit -m "$(cat <<'EOF'
refactor: Card shell on shadcn Card primitive (ui/card)

Card's <div> shell now comes from ui/card; the as=article|li path and
LinkCard keep their verbatim classes. Sub-parts (CardHeader/Title/…)
vendored for future use, unused today. No call sites change.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Full-suite verification + developer note

**Files:**
- Create: `src/components/ui/README.md`
- Modify: none

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: nothing (docs + gate only).

- [ ] **Step 1: Run the whole content/logic test suite**

Run: `npm run test:content 2>&1 | grep -E "# (tests|pass|fail)"`
Expected: `# fail 0`. The two new files (`button-variants.test.ts`, `badge-variants.test.ts`) are picked up by the `src/**/*.test.ts` glob and pass.

- [ ] **Step 2: Run lint on every touched file**

Run:
```bash
npx eslint src/components/ui.tsx src/components/ui/button.tsx src/components/ui/badge.tsx src/components/ui/card.tsx src/lib/utils.ts 2>&1 | tail -20
```
Expected: 0 errors. Pre-existing unrelated warnings elsewhere are fine; no NEW warning in these files.

- [ ] **Step 3: Typecheck — full diff against baseline**

Run: `npm run typecheck 2>&1 | grep -c "error TS"`
Expected: exactly the baseline count recorded in Task 1 Step 5. If higher, a wrapper type is wrong — fix before proceeding.

- [ ] **Step 4: Production build**

Run: `npm run build 2>&1 | tail -5`
Expected: build completes, route table prints, no `Failed to compile`.

- [ ] **Step 5: Broad visual pass**

Run:
```bash
(npm run dev > /tmp/dev.log 2>&1 &) ; sleep 9
for p in / /watch /watch/messages /grow/find-a-dgroup /serve /events /centris/facilities/sports-hall /giving; do
  echo "== $p =="; curl -s "http://localhost:3000$p" -o /dev/null -w "%{http_code}\n"
done
taskkill //F //IM node.exe 2>/dev/null || pkill -f "next dev" || true
```
Expected: every page returns `200`. Then open `/`, a dark section page (`/` hero + `/serve` deep section), a Pill-heavy page (`/grow/find-a-dgroup`), and a form page (`/serve/[slug]`) in a browser and confirm buttons, pills, and cards look identical to `main`.

- [ ] **Step 6: Write `src/components/ui/README.md`**

```markdown
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
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/README.md
git commit -m "$(cat <<'EOF'
docs: note on the ui/ shadcn primitive layer

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Open the PR (or report ready to merge)**

```bash
git push -u origin shadcn-migration
```
Then summarise: primitives added, wrappers unchanged, zero call-site edits, build green against baseline, pages visually identical.

---

## Self-Review

**1. Spec coverage**

| Spec item | Task |
|---|---|
| Vendor, don't `init` | Task 1 (manual `components.json`, no CLI) + Tasks 2–4 (hand-written files) |
| Tailwind v4 / no config file | Global Constraints; `components.json` `config: ""`; token strings not `hsl(var())` |
| `cn` + `clsx` + `tailwind-merge`, keep `cx` | Task 1 Step 2; `ui.tsx` keeps `cx` (Tasks 2–4 notes) |
| Button → shadcn, 8 tones verbatim, `.btn-press`, no ring | Task 2 |
| `ButtonLink` wrapper, no call-site change | Task 2 Step 5 |
| Pill → Badge, 6 tones verbatim | Task 3 |
| Card / LinkCard → shadcn Card shell | Task 4 |
| `DetailRow`, `EmptyState`, `BigNumeral`, `LiveDot`, `Section`, `Container`, `Eyebrow`, `SectionHead`, `PageHeader` untouched | File Structure ("Untouched"); no task modifies them |
| `cards.tsx`, `motion.tsx` untouched | File Structure |
| No dark mode | Global Constraints |
| Baseline-red build comparison | Global Constraints; every typecheck step filters known errors |
| Each phase = reviewable diff + checkpoint | Tasks 1–5 each end in build + visual + commit |
| Developer note / README | Task 5 Step 6 |

No gaps.

**2. Placeholder scan** — no "TBD"/"handle edge cases"/"similar to Task N". Every code step has full source. The one skipped test cycle (Task 4) is called out with a reason.

**3. Type consistency** — `buttonVariants`/`ButtonTone`/`TONES` (Task 2) referenced consistently in Task 2's test and `ui.tsx` rewrite. `badgeVariants`/`PillTone`/`PILL_TONES` (Task 3) consistent across its test and wrapper. `cn` signature identical in Task 1 and its consumers. `Card as CardBase` import alias consistent in Task 4. Wrapper prop names (`tone`, `size`, `full`, `as`) match today's `ui.tsx` exactly.
