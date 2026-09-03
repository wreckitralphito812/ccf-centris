# "Occupied" Design Redirection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redirect the CCF Centris homepage so real CCF footage is the visual ground and paper is the material placed on top, with a varied section cadence and one cinematic hero sequence.

**Architecture:** Three layers, built bottom-up. First the image layer (`next/image` + a shared thumbnail helper) so real photography can be art-directed. Then the cadence layer (five section components in `src/components/cadence.tsx`) that replaces uniform `Section` stacking. Finally the hero (a pinned, scroll-scrubbed sequence built on native CSS scroll-driven animation with a static mobile floor). The homepage is recomposed onto these pieces; `src/lib/queries.ts` and all data flow are untouched.

**Tech Stack:** Next.js 16.3.4 (App Router), React 19.2.8, TypeScript 5, Tailwind CSS 4.3.3. No new runtime dependencies.

## Global Constraints

- **No new runtime dependencies.** Native CSS scroll-driven animation and `position: sticky` only. GSAP is permitted only if native is demonstrably inadequate, and that requires evidence from real testing plus a note in the plan's Task 9 findings.
- **Verify Next.js APIs against `node_modules/next/dist/docs/` before writing code.** This version has breaking changes from common knowledge. Confirmed already: `next/image` uses `preload` (not `priority`), `onLoadingComplete` is **deprecated** in favour of `onLoad`, and `fill` requires the parent to be `position: relative|fixed|absolute`.
- **There is no test runner in this project.** No vitest, no jest, no playwright, no test script in `package.json`. Do not add one. The verification cycle for every task is `npm run typecheck`, then `npm run build`, then visual confirmation in `npm run dev`. Where a task has a behavioural assertion that typecheck cannot catch, the plan states the exact thing to look at in the browser.
- **Design tokens are frozen.** Do not add, rename, or change any custom property in the `:root` block of `src/app/globals.css`. Teal `#007682` for type and controls, brand teal `#00a6b6` for graphics only, maroon `#72042c`, Fraunces display, Montserrat sans, Caveat script. New CSS goes in the sections below `:root`.
- **No dark mode.** Photo sections use dark *grounds* (the existing `--night` token). The site does not gain a dark *theme*.
- **Imagery is CCF's published material only.** YouTube thumbnails via `i.ytimg.com` and channel art via `yt3.ggpht.com`, both already allowed in `next.config.ts`. No stock, no commissioned, no invented imagery.
- **Every motion effect must have a resolved static end state** under `prefers-reduced-motion: reduce` and on viewports under 768px. The static state is a designed composition, not a broken one.
- **Accessibility floor:** contrast ratios must hold against whatever sits behind type. Decorative imagery carries `alt=""` and `aria-hidden`. Focus styles from `:focus-visible` in `globals.css` must remain visible over photography.
- **Commit after each task.** Do not push. Do not amend earlier commits.

---

## File Structure

**Create:**
- `src/lib/images.ts` — YouTube thumbnail URL helpers and crop presets. Pure functions, no React, no fetching.
- `src/components/media.tsx` — `Frame`, the single art-directed image component every photo slot uses.
- `src/components/cadence.tsx` — the five section-cadence components.
- `src/components/hero.tsx` — the pinned hero sequence. **Server component** — all motion is CSS, so it ships no JavaScript of its own.

**Modify:**
- `src/app/globals.css` — add scrim, scroll-timeline, and reveal CSS below the existing token block.
- `src/components/hero-backdrop.tsx` — replace the blanket wash with local scrims; switch to `next/image`.
- `src/app/page.tsx` — recompose onto the cadence components.
- `src/app/watch/archive/page.tsx` — convert three `<img>` tags to `Frame`.
- `src/app/watch/live/page.tsx` — convert one `<img>` tag to `Frame`.

**Leave alone:**
- `src/lib/queries.ts`, `src/lib/youtube.ts`, `src/lib/format.ts`, `src/lib/site.ts` — data layer, untouched.
- `src/components/ui.tsx` — `Section` and `SectionHead` stay for unmigrated routes.

---

## Task 1: Thumbnail helpers and crop presets

**Files:**
- Create: `src/lib/images.ts`

**Interfaces:**
- Consumes: `ChannelVideo` from `src/lib/youtube.ts` (fields: `id`, `title`, `published`, `thumbnail`, `href`, `isSundayService`).
- Produces:
  - `type Crop = "portrait" | "cinema" | "square" | "video"`
  - `const CROP: Record<Crop, { width: number; height: number; className: string }>`
  - `function thumbUrl(videoId: string, quality?: "hq" | "maxres"): string`
  - `function sizesFor(crop: Crop): string`

**Context:** YouTube serves `hqdefault.jpg` at 480x360 (4:3, with letterbox bars top and bottom on 16:9 content) and `maxresdefault.jpg` at 1280x720 (true 16:9, but **not available for every video** — it 404s on older or low-resolution uploads). `src/lib/youtube.ts:72` currently hardcodes the `hqdefault` URL. This task centralises URL construction so crops can be chosen per slot.

- [ ] **Step 1: Write the file**

```ts
/**
 * Art direction for CCF's published thumbnails.
 *
 * The source images are uncontrolled - whatever CCF uploaded, at whatever
 * framing. These presets impose consistent composition on top of that
 * variability, which is what makes public imagery safe to build a visual
 * system on.
 */

/** Named aspect slots used across the site. */
export type Crop = "portrait" | "cinema" | "square" | "video";

/**
 * Intrinsic dimensions per slot. `next/image` needs width and height to
 * reserve layout space; the className carries the aspect ratio so the
 * rendered box matches regardless of the source image's real shape.
 */
export const CROP: Record<Crop, { width: number; height: number; className: string }> = {
  portrait: { width: 720, height: 1080, className: "aspect-[2/3]" },
  cinema: { width: 1600, height: 680, className: "aspect-[40/17]" },
  square: { width: 900, height: 900, className: "aspect-square" },
  video: { width: 1280, height: 720, className: "aspect-video" },
};

/**
 * Thumbnail URL for a video id.
 *
 * `hq` (480x360) exists for every video and is the safe default. `maxres`
 * (1280x720) is sharper but 404s on older uploads, so only reach for it
 * where a soft fallback exists.
 */
export function thumbUrl(videoId: string, quality: "hq" | "maxres" = "hq"): string {
  const file = quality === "maxres" ? "maxresdefault" : "hqdefault";
  return `https://i.ytimg.com/vi/${videoId}/${file}.jpg`;
}

/**
 * Responsive `sizes` hint per slot, so the optimizer requests a sensible
 * width instead of assuming full viewport.
 */
export function sizesFor(crop: Crop): string {
  switch (crop) {
    case "portrait":
      return "(max-width: 768px) 60vw, 22vw";
    case "cinema":
      return "100vw";
    case "square":
      return "(max-width: 768px) 45vw, 20vw";
    case "video":
      return "(max-width: 1024px) 100vw, 60vw";
  }
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS, no errors. The `switch` in `sizesFor` is exhaustive over `Crop`, so TypeScript infers a `string` return without a fallthrough.

- [ ] **Step 3: Commit**

```bash
git add src/lib/images.ts
git commit -m "feat: add thumbnail crop presets and URL helpers"
```

---

## Task 2: The Frame component

**Files:**
- Create: `src/components/media.tsx`

**Interfaces:**
- Consumes: `Crop`, `CROP`, `sizesFor` from `src/lib/images.ts` (Task 1).
- Produces: `function Frame(props: FrameProps): ReactElement` where

```ts
interface FrameProps {
  src: string;
  alt: string;             // "" marks the image decorative
  crop?: Crop;             // default "video"
  className?: string;      // applied to the outer wrapper
  preload?: boolean;       // true only for the LCP image
  tone?: "none" | "scrim" | "duotone";  // default "none"
  children?: ReactNode;    // overlay content, positioned above the image
}
```

**Context:** Every photo slot on the site goes through this one component. It owns the `position: relative` wrapper that `fill` requires, the aspect ratio, the optional scrim, and overlay children. Nothing else in the codebase should call `next/image` directly.

- [ ] **Step 1: Write the file**

```tsx
import Image from "next/image";
import type { ReactNode } from "react";
import { CROP, sizesFor, type Crop } from "@/lib/images";

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * A single art-directed image slot.
 *
 * Owns the relative wrapper `fill` requires, the aspect ratio, an optional
 * scrim for type legibility, and any overlay content. The scrim is
 * deliberately local and directional - it darkens the bottom of the frame
 * where captions sit, rather than washing the whole image and hiding faces.
 */
export function Frame({
  src,
  alt,
  crop = "video",
  className,
  preload = false,
  tone = "none",
  children,
}: {
  src: string;
  alt: string;
  crop?: Crop;
  className?: string;
  preload?: boolean;
  tone?: "none" | "scrim" | "duotone";
  children?: ReactNode;
}) {
  const decorative = alt === "";

  return (
    <div
      className={cx(
        "relative overflow-hidden bg-paper-deep",
        CROP[crop].className,
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        preload={preload}
        sizes={sizesFor(crop)}
        className="object-cover"
        aria-hidden={decorative || undefined}
      />

      {tone === "scrim" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-night/80 via-night/35 to-transparent"
        />
      ) : null}

      {tone === "duotone" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-night/45 mix-blend-multiply"
        />
      ) : null}

      {children ? <div className="relative h-full w-full">{children}</div> : null}
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `npm run typecheck`
Expected: PASS. If TypeScript rejects `preload`, the installed `next/image` types differ from the bundled docs — re-read `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` and use whatever prop that version declares. Do not guess `priority`.

- [ ] **Step 3: Commit**

```bash
git add src/components/media.tsx
git commit -m "feat: add Frame, the shared art-directed image slot"
```

---

## Task 3: Convert existing raw img tags to Frame

**Files:**
- Modify: `src/app/page.tsx:431` (inside `FromTheChannel`)
- Modify: `src/app/watch/archive/page.tsx:94,173,218`
- Modify: `src/app/watch/live/page.tsx:271`

**Interfaces:**
- Consumes: `Frame` from `src/components/media.tsx` (Task 2).
- Produces: nothing new. This is a swap.

**Context:** `next.config.ts` already allows `i.ytimg.com` and `yt3.ggpht.com`, but every image is a raw `<img>`, so none are optimized. Converting them is a real performance and sharpness win independent of the rest of the redesign, which is why it lands before any visual change.

- [ ] **Step 1: Convert the `FromTheChannel` thumbnail in `src/app/page.tsx`**

Replace the `<img>` at line 431 and its wrapper's `aspect-video overflow-hidden` classes. The existing anchor is:

```tsx
<a
  href={latest.href}
  target="_blank"
  rel="noreferrer"
  className="group relative block aspect-video overflow-hidden border border-hairline"
>
```

Change it to, and replace the `<img>` inside with a `Frame`:

```tsx
<a
  href={latest.href}
  target="_blank"
  rel="noreferrer"
  className="group block border border-hairline"
>
  <Frame src={latest.thumbnail} alt={`Watch: ${latest.title}`} crop="video">
    <span className="pointer-events-none absolute inset-0 grid place-items-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-clay text-2xl text-paper-bright">
        ▶
      </span>
    </span>
  </Frame>
</a>
```

Add `import { Frame } from "@/components/media";` to the imports at the top of the file. The old `<span className="pointer-events-none absolute inset-0 ...">` that sat as a sibling of the `<img>` moves inside `Frame` as its child, exactly as shown.

- [ ] **Step 2: Convert the three thumbnails in `src/app/watch/archive/page.tsx`**

Read lines 90-98, 169-177, and 214-222 first to see each surrounding wrapper. For each, apply the same transformation: remove `aspect-video overflow-hidden` from the wrapper (keep `relative` only if other absolutely-positioned children depend on it), replace the `<img>` with `<Frame src={...} alt={...} crop="video" />`, preserving the existing `src` and `alt` expressions verbatim. Add the `Frame` import once at the top.

- [ ] **Step 3: Convert the thumbnail in `src/app/watch/live/page.tsx`**

Read lines 267-275 first. Apply the same transformation. Add the `Frame` import.

- [ ] **Step 4: Verify**

Run: `npm run typecheck`
Expected: PASS.

Run: `npm run build`
Expected: PASS, all routes build.

Run: `npm run dev`, then open `http://localhost:3000`, `/watch/archive`, and `/watch/live`.
Expected: every thumbnail still renders, now served from `/_next/image?url=...` rather than directly from `i.ytimg.com`. Confirm in DevTools Network tab. No layout shift on load.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/watch/archive/page.tsx src/app/watch/live/page.tsx
git commit -m "refactor: serve CCF thumbnails through next/image via Frame"
```

---

## Task 4: Unwash the hero backdrop

**Files:**
- Modify: `src/components/hero-backdrop.tsx:66-111`

**Interfaces:**
- Consumes: `Frame` is **not** used here — the backdrop needs a bare `next/image` with `fill` because it sits behind an iframe in a custom stacking context. Import `Image from "next/image"` directly. This is the one sanctioned exception to the "everything goes through Frame" rule, and the reason is recorded in a comment.
- Produces: unchanged public API. `HeroBackdrop({ videos }: { videos: ChannelVideo[] })`.

**Context:** Lines 99-108 currently stack three full-frame layers over live CCF worship footage: `bg-paper-deep/85`, a left-to-right gradient, and a dot screen. Combined, the footage reads at roughly 15% clarity — faces are invisible. The fix is a scrim local to where type actually sits, not a blanket.

- [ ] **Step 1: Replace the poster `<img>` with `next/image`**

The current poster at line 69:

```tsx
<img
  src={current.thumbnail}
  alt=""
  className="absolute inset-0 h-full w-full scale-105 object-cover"
  loading="eager"
  decoding="async"
/>
```

becomes:

```tsx
{/* Bare next/image rather than <Frame>: this sits behind an iframe in a
    custom stacking context and must fill an externally-sized box, which
    Frame's own aspect-ratio wrapper would fight. */}
<Image
  src={current.thumbnail}
  alt=""
  fill
  preload
  sizes="100vw"
  className="scale-105 object-cover"
/>
```

Add `import Image from "next/image";` at the top of the file.

- [ ] **Step 2: Replace the three wash layers with local scrims**

Delete lines 99-108 entirely (the comment `{/* Wash. ... */}`, the `bg-paper-deep/85` div, the gradient div, and the dot-screen div). Replace with:

```tsx
{/* Scrims. Local to where type sits rather than a sheet over the whole
    frame, so CCF's actual congregation stays visible. The headline block
    occupies the lower-left, so that is the only region that darkens. */}
<div
  aria-hidden
  className="pointer-events-none absolute inset-0 bg-linear-to-tr from-night/85 via-night/40 to-transparent"
/>
<div
  aria-hidden
  className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-night/70 to-transparent"
/>
```

- [ ] **Step 3: Verify contrast in the browser**

Run: `npm run dev`, open `http://localhost:3000` on a desktop-width window.

Expected:
- CCF worship footage is clearly visible — you can make out people, not just a beige haze.
- The hero headline still passes contrast against the darkened lower-left. Check with DevTools' contrast inspector on the largest headline text: it must be at least 4.5:1, or 3:1 if the computed size is at least 24px bold / 18.66px bold.
- If contrast fails, deepen only the *first* gradient's `from-night/85` toward `from-night/95`. Do not re-add a full-frame wash.

**Note:** the hero currently renders `--ink` type on paper. Because the ground is now dark footage, the hero's text colour must change in Task 7 when the hero is recomposed. In this task the headline may look wrong against the new dark scrim — that is expected and Task 7 fixes it. Verify only that the *image* is visible and the scrim geometry is right.

- [ ] **Step 4: Verify the reduced-motion and small-screen gates still hold**

In DevTools, enable "Emulate CSS prefers-reduced-motion: reduce" and reload.
Expected: no iframe in the DOM, the still image renders, scrims render identically.

Resize below 768px and reload.
Expected: no iframe, still image renders.

- [ ] **Step 5: Verify build**

Run: `npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/hero-backdrop.tsx
git commit -m "feat: unwash hero footage with local scrims instead of a blanket"
```

---

## Task 5: Cadence CSS

**Files:**
- Modify: `src/app/globals.css` (append below the existing `no-bar` block at the end of the file)

**Interfaces:**
- Produces: CSS classes `.reveal`, `.reveal-in`, `.bleed`, `.measure`, and the `@supports` block gating scroll-driven animation. Consumed by Tasks 6 and 7.

**Context:** Tailwind 4.3.3 ships no utilities for `animation-timeline` or `view()`, so scroll-driven animation belongs in `globals.css` next to the existing `rail`, `pulse-dot`, and `rise` keyframes. The existing `prefers-reduced-motion` block at the end of the file already neutralises all animation durations globally, so new keyframes inherit that protection automatically — do not duplicate it.

- [ ] **Step 1: Append the cadence and reveal CSS**

```css
/* ---------------------------------------------------------------------------
   Cadence

   The homepage alternates between five section shapes so no two consecutive
   sections announce themselves the same way. Irregularity is the point.
   --------------------------------------------------------------------------- */

/* Escape the container and run to both viewport edges. */
.bleed {
  width: 100vw;
  margin-left: 50%;
  transform: translateX(-50%);
}

/* A comfortable reading measure for quiet, text-only sections. */
.measure {
  max-width: 62ch;
}

/* ---------------------------------------------------------------------------
   Reveal

   Sections settle into place as they enter the viewport. Native scroll-driven
   animation where supported; a plain static end state everywhere else, which
   is also exactly what reduced-motion users get via the global block below.
   --------------------------------------------------------------------------- */

@keyframes settle {
  from {
    opacity: 0;
    transform: translate3d(0, 22px, 0);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* Default: fully resolved. Anything that never animates still looks right. */
.reveal {
  opacity: 1;
  transform: none;
}

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal {
      animation: settle 1ms linear both;
      animation-timeline: view();
      /* Start as the element's top edge enters, finish a third of the way up. */
      animation-range: entry 5% cover 32%;
    }
  }
}

/* Stagger children of a revealing group. */
.reveal-in > * {
  animation-delay: calc(var(--i, 0) * 80ms);
}

/* ---------------------------------------------------------------------------
   Hero scrub

   The hero pins for a fixed scroll distance while the paper panel rises over
   the footage. `position: sticky` does the pinning; the scroll timeline
   drives the transform. Both degrade to a static composed frame.
   --------------------------------------------------------------------------- */

@keyframes hero-media {
  from {
    transform: scale(1.08);
  }
  to {
    transform: scale(0.92);
  }
}

@keyframes hero-panel {
  from {
    opacity: 0;
    transform: translate3d(0, 60px, 0);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.hero-stage {
  position: relative;
}

.hero-pin {
  position: sticky;
  top: 0;
  min-height: 100svh;
  overflow: hidden;
}

/* Static end state. The scrub only applies where it is both supported and
   wanted; otherwise this composed frame is what everyone sees. */
.hero-media {
  transform: scale(1);
}

.hero-panel {
  opacity: 1;
  transform: none;
}

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) and (min-width: 768px) {
    .hero-media {
      animation: hero-media 1ms linear both;
      animation-timeline: view();
      animation-range: cover 0% cover 60%;
    }

    .hero-panel {
      animation: hero-panel 1ms linear both;
      animation-timeline: view();
      animation-range: cover 10% cover 55%;
    }
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS. Tailwind 4 processes the file; unknown at-rules like `@supports` and `animation-timeline` pass through untouched.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add cadence, reveal, and hero scrub CSS"
```

---

## Task 6: The five cadence components

**Files:**
- Create: `src/components/cadence.tsx`

**Interfaces:**
- Consumes: `Container` from `src/components/ui.tsx`; `Eyebrow` from `src/components/ui.tsx`; the `.bleed`, `.measure`, `.reveal` classes from Task 5.
- Produces, all with the same head props (`eyebrow?`, `title`, `lead?`, `action?`) mirroring the existing `SectionHead` contract:
  - `function FullBleed(props: BleedProps): ReactElement`
  - `function Measure(props: CadenceProps): ReactElement`
  - `function Split(props: SplitProps): ReactElement`
  - `function Rail(props: CadenceProps): ReactElement`
  - `function Overlap(props: CadenceProps): ReactElement`

```ts
interface CadenceProps {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
  tone?: "paper" | "deep" | "bright" | "ink";
  className?: string;
}

interface BleedProps extends Omit<CadenceProps, "tone"> {
  image: string;          // thumbnail URL
  imageAlt: string;       // "" if decorative
}

interface SplitProps extends CadenceProps {
  media: ReactNode;       // usually a <Frame>
  flip?: boolean;         // media on the left instead of the right
}
```

**Context:** These replace uniform `Section` -> `SectionHead` -> grid stacking. Each depends only on tokens and `Container` — no data fetching, no knowledge of which page renders it — so any one can be swapped at a call site without touching the content inside.

- [ ] **Step 1: Write the file**

```tsx
import type { ReactNode } from "react";
import { Container, Eyebrow } from "@/components/ui";
import { Frame } from "@/components/media";

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

const TONES = {
  paper: "bg-paper text-ink",
  deep: "bg-paper-deep text-ink",
  bright: "bg-paper-bright text-ink",
  ink: "bg-night text-paper-bright",
} as const;

interface CadenceProps {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
  tone?: keyof typeof TONES;
  className?: string;
}

/** Shared heading block. Inverts its lead colour on dark grounds. */
function Head({
  eyebrow,
  title,
  lead,
  action,
  dark,
}: Pick<CadenceProps, "eyebrow" | "title" | "lead" | "action"> & { dark: boolean }) {
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow tone={dark ? "paper" : "clay"}>{eyebrow}</Eyebrow> : null}
        <h2 className="display-md mt-4 text-balance">{title}</h2>
        {lead ? (
          <p
            className={cx(
              "mt-4 text-[1.02rem] leading-relaxed",
              dark ? "text-paper-bright/75" : "text-ink-soft",
            )}
          >
            {lead}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Edge-to-edge photography with type laid over it. The loudest cadence -
 * use it sparingly, and never twice in a row.
 */
export function FullBleed({
  eyebrow,
  title,
  lead,
  action,
  children,
  id,
  image,
  imageAlt,
  className,
}: CadenceProps & { image: string; imageAlt: string }) {
  return (
    <section id={id} className={cx("relative bg-night text-paper-bright", className)}>
      <div className="absolute inset-0">
        <Frame src={image} alt={imageAlt} crop="cinema" tone="duotone" className="h-full" />
      </div>
      <Container wide className="reveal relative py-24 sm:py-32">
        <Head eyebrow={eyebrow} title={title} lead={lead} action={action} dark />
        <div className="mt-12">{children}</div>
      </Container>
    </section>
  );
}

/**
 * A quiet, narrow column. Generous margins, nothing competing.
 * Follows a loud section to let the page breathe.
 */
export function Measure({
  eyebrow,
  title,
  lead,
  action,
  children,
  id,
  tone = "paper",
  className,
}: CadenceProps) {
  return (
    <section id={id} className={cx("py-20 sm:py-28", TONES[tone], className)}>
      <Container>
        <div className="reveal measure mx-auto">
          <Head
            eyebrow={eyebrow}
            title={title}
            lead={lead}
            action={action}
            dark={tone === "ink"}
          />
          <div className="mt-10">{children}</div>
        </div>
      </Container>
    </section>
  );
}

/**
 * Asymmetric two-column. Media bleeds off one edge, text holds the other.
 */
export function Split({
  eyebrow,
  title,
  lead,
  action,
  children,
  id,
  tone = "paper",
  media,
  flip = false,
  className,
}: CadenceProps & { media: ReactNode; flip?: boolean }) {
  return (
    <section id={id} className={cx("overflow-hidden py-20 sm:py-28", TONES[tone], className)}>
      <Container wide>
        <div
          className={cx(
            "reveal grid items-center gap-12 lg:gap-16",
            flip ? "lg:grid-cols-[0.9fr_1.1fr]" : "lg:grid-cols-[1.1fr_0.9fr]",
          )}
        >
          <div className={flip ? "lg:order-2" : undefined}>
            <Head
              eyebrow={eyebrow}
              title={title}
              lead={lead}
              action={action}
              dark={tone === "ink"}
            />
            <div className="mt-10">{children}</div>
          </div>
          <div className={flip ? "lg:order-1" : undefined}>{media}</div>
        </div>
      </Container>
    </section>
  );
}

/**
 * Horizontal scroll, cropped at the viewport edge so the row visibly
 * continues past the fold. Children should be fixed-width cards.
 */
export function Rail({
  eyebrow,
  title,
  lead,
  action,
  children,
  id,
  tone = "paper",
  className,
}: CadenceProps) {
  return (
    <section id={id} className={cx("py-20 sm:py-28", TONES[tone], className)}>
      <Container wide>
        <div className="reveal">
          <Head
            eyebrow={eyebrow}
            title={title}
            lead={lead}
            action={action}
            dark={tone === "ink"}
          />
        </div>
      </Container>
      <div className="no-bar mt-12 overflow-x-auto">
        <div className="flex gap-6 px-5 sm:px-8 *:w-76 *:shrink-0">
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * Breaks the seam with the section above by pulling up into it.
 * The panel must sit on an opaque ground or the overlap reads as a mistake.
 */
export function Overlap({
  eyebrow,
  title,
  lead,
  action,
  children,
  id,
  tone = "bright",
  className,
}: CadenceProps) {
  return (
    <section id={id} className={cx("relative z-10 -mt-16 sm:-mt-24", className)}>
      <Container>
        <div
          className={cx(
            "reveal border border-hairline px-6 py-12 sm:px-12 sm:py-16",
            TONES[tone],
          )}
        >
          <Head
            eyebrow={eyebrow}
            title={title}
            lead={lead}
            action={action}
            dark={tone === "ink"}
          />
          <div className="mt-10">{children}</div>
        </div>
      </Container>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/cadence.tsx
git commit -m "feat: add the five section cadence components"
```

---

## Task 7: The hero sequence

**Files:**
- Create: `src/components/hero.tsx`
- Modify: `src/app/page.tsx:96-174` (replace the existing `Hero` function)

**Interfaces:**
- Consumes: `HeroBackdrop` from `src/components/hero-backdrop.tsx`; `ChannelVideo` from `src/lib/youtube.ts`; the `.hero-stage`, `.hero-pin`, `.hero-media`, `.hero-panel` classes from Task 5; `Countdown` from `src/components/service-status.tsx`; `LiveDot`, `Container`, `ButtonLink` from `src/components/ui.tsx`.
- Produces: `function Hero(props): ReactElement` with the same props the current homepage `Hero` takes:

```ts
{
  live: boolean;
  next: Awaited<ReturnType<typeof getServiceWindow>>["next"];
  current: Awaited<ReturnType<typeof getServiceWindow>>["current"];
  backdrop: ChannelVideo[];
}
```

**Context:** This is the one cinematic moment in the whole redirection. It pins for roughly 150vh of scroll while the footage scales down and the paper panel rises over it. Everything is driven by `position: sticky` plus the scroll timelines from Task 5 — no JavaScript scroll listener, no motion library.

**Critical:** the hero must remain a **server component wrapper** around the existing client `HeroBackdrop`. Do not add `"use client"` to `hero.tsx` — the CSS does all the animation, so there is nothing for the client to do.

- [ ] **Step 1: Read the current Hero implementation**

Run: `sed -n '96,174p' src/app/page.tsx`

Read it fully before writing the replacement. It contains the live badge, the headline, the service copy, and the CTA buttons. **Preserve every piece of that content and every link target verbatim** — this task changes composition and colour, not copy. Copy is CCF's and is not yours to rewrite.

- [ ] **Step 2: Write `src/components/hero.tsx`**

Build it to this structure, filling the content slots with the exact text, links, and components you read in Step 1:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { Container, LiveDot } from "@/components/ui";
import { HeroBackdrop } from "@/components/hero-backdrop";
import type { ChannelVideo } from "@/lib/youtube";

/**
 * The one cinematic moment on the site.
 *
 * A sticky stage pins the footage for roughly 150vh of scroll while the
 * paper panel rises over it. All motion comes from CSS scroll timelines in
 * globals.css, so this stays a server component and ships no JavaScript.
 *
 * Under reduced motion, below 768px, or without scroll-timeline support,
 * the composed end state renders directly - a designed still, not a
 * degraded fallback.
 */
export function Hero({
  live,
  next,
  current,
  backdrop,
  children,
}: {
  live: boolean;
  next: unknown;
  current: unknown;
  backdrop: ChannelVideo[];
  children?: ReactNode;
}) {
  return (
    <div className="hero-stage h-[150svh]">
      <div className="hero-pin grid items-end">
        {/* Footage layer. Scales down through the scrub. */}
        <div className="hero-media absolute inset-0">
          <HeroBackdrop videos={backdrop} />
        </div>

        {/* Type layer. Rises over the footage and locks. */}
        <Container wide className="hero-panel relative pb-20 sm:pb-28">
          {live ? (
            <Link
              href="/watch/live"
              className="label inline-flex items-center gap-2 bg-clay px-3 py-1.5 text-paper-bright"
            >
              <LiveDot />
              CCF Centris is live
            </Link>
          ) : null}

          {/* Headline, service copy, and CTAs go here - copied verbatim
              from the previous Hero in page.tsx. Type is now on dark
              footage, so text colour becomes text-paper-bright and any
              text-ink-soft becomes text-paper-bright/75. */}
          {children}
        </Container>
      </div>
    </div>
  );
}
```

Replace the comment block with the real content from Step 1, applying only these colour changes, since the ground is now dark footage rather than paper:
- `text-ink` becomes `text-paper-bright`
- `text-ink-soft` becomes `text-paper-bright/75`
- `text-ink-mute` becomes `text-paper-bright/60`
- Outlined buttons using `border-ink ... text-ink` become `border-paper-bright/70 ... text-paper-bright`, with hover `hover:bg-paper-bright hover:text-ink`
- Solid `bg-clay text-paper-bright` buttons are unchanged — they already work on dark

Type the `next` and `current` props properly rather than leaving them `unknown`: import `getServiceWindow` types the same way `page.tsx` currently does, so the signature matches the call site exactly.

- [ ] **Step 3: Swap it into the homepage**

In `src/app/page.tsx`, delete the local `Hero` function (lines 96-174) and add `import { Hero } from "@/components/hero";`. The call site in `HomePage` stays exactly as it is — same props, same order.

- [ ] **Step 4: Verify the scrub on desktop**

Run: `npm run dev`, open `http://localhost:3000` in a Chromium browser at desktop width.

Expected:
- The hero holds in place while you scroll roughly one and a half screens.
- The footage scales down slightly as you scroll; the panel rises and settles.
- The sequence completes and normal document scroll resumes into the next section — no jump, no gap, no double scrollbar.
- Headline text is legible against the footage at every point in the scrub.

- [ ] **Step 5: Verify the static floor**

In DevTools, enable "Emulate CSS prefers-reduced-motion: reduce", reload.
Expected: the hero renders as a composed still — footage visible, panel in its final position, all text legible. No pinning, no scaling. It should look deliberate.

Resize below 768px, reload.
Expected: same composed still. No iframe. No pinning artefacts. Nothing clipped off-screen.

Test in Safari if available (or note that it is untested).
Expected: either the scrub runs, or the static floor renders cleanly. Both are acceptable outcomes. **A broken layout is not.**

- [ ] **Step 6: Verify build**

Run: `npm run typecheck && npm run build`
Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/hero.tsx src/app/page.tsx
git commit -m "feat: pin and scrub the hero over live CCF footage"
```

---

## Task 8: Recompose the homepage onto the cadence

**Files:**
- Modify: `src/app/page.tsx` (the ten section functions below `Hero`)

**Interfaces:**
- Consumes: `FullBleed`, `Measure`, `Split`, `Rail`, `Overlap` from `src/components/cadence.tsx` (Task 6); `Frame` from `src/components/media.tsx` (Task 2).
- Produces: nothing new.

**Context:** The homepage currently has eleven near-identical sections. This assigns each a cadence so that **no two consecutive sections share a type** — the central success criterion of the redirection.

The mapping, matching the spec:

| Section | Current line | Cadence | Tone |
|---|---|---|---|
| `NextUp` | 175 | `Overlap` | bright |
| `NewHere` | 255 | `Measure` | paper |
| `ThisWeek` | 307 | `Rail` | deep |
| `LatestTeaching` | 331 | `Split` | paper |
| `FromTheChannel` | 402 | `Split` flip | bright |
| `Together` | 474 | `Measure` | paper |
| `Communities` | 535 | `Rail` | deep |
| `ExploreCenter` | 560 | `FullBleed` | — |
| `PlayAtCentris` | 612 | `Overlap` | bright |
| `Serve` | 670 | `Split` | paper |
| `FindUs` | 714 | `FullBleed` | — |

Note `LatestTeaching` and `FromTheChannel` are both `Split` but adjacent — the second uses `flip` so the media lands on the opposite side, which reads as a deliberate pair rather than a repeat.

- [ ] **Step 1: Convert one section and verify before doing the rest**

Start with `NewHere` (line 255) — it is text-only, so it is the lowest-risk conversion. Read it, then replace its `<Section>` / `<Container>` / `<SectionHead>` wrapper with `<Measure>`, passing the same `eyebrow`, `title`, and `lead` values, keeping all inner content as children.

Run: `npm run dev` and confirm the section still renders with all its content, now in a narrower column.

- [ ] **Step 2: Convert the remaining nine sections per the table**

For each: keep every piece of copy, every link target, and every data expression exactly as it is. Only the wrapper changes.

For the two `FullBleed` sections, supply the `image` prop from a CCF thumbnail already available in that section's data — `ExploreCenter` and `FindUs` do not currently fetch video, so pass the first backdrop video's thumbnail down from `HomePage`, which already has `backdrop` in scope. Pass `imageAlt=""` since these are decorative grounds.

For `Rail` sections, the children must be fixed-width cards — the component applies `w-[19rem]` to direct children, so remove any `grid` wrapper inside and render the cards as a flat list.

- [ ] **Step 3: Verify no two consecutive sections share a cadence**

Read the `HomePage` return block top to bottom and check the sequence against the table:
`Hero → Overlap → Measure → Rail → Split → Split(flip) → Measure → Rail → FullBleed → Overlap → Split → FullBleed`

Expected: the only adjacent repeat is the deliberate `Split` / `Split(flip)` pair.

- [ ] **Step 4: Verify the whole page**

Run: `npm run typecheck && npm run build`
Expected: both PASS, all routes build.

Run: `npm run dev` and scroll the entire homepage at desktop width.
Expected: every section renders its original content; the page reads with varied rhythm; `Overlap` sections break the seam cleanly without clipping the section above; `Rail` sections crop at the right viewport edge and scroll horizontally.

At mobile width, scroll the whole page.
Expected: no horizontal overflow anywhere except inside the intentional `Rail` scrollers. Check by confirming `document.documentElement.scrollWidth === document.documentElement.clientWidth` in the console.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: recompose the homepage onto the five-type cadence"
```

---

## Task 9: Verification pass and findings

**Files:**
- Create: `docs/superpowers/plans/2026-09-03-occupied-findings.md`

**Context:** The spec's success criteria are explicit and testable. This task checks each one and records the result honestly, including anything that failed. It also records the native-versus-GSAP decision with evidence, which the Global Constraints require before any library could be added.

- [ ] **Step 1: Check each success criterion and record the result**

Write the findings file with one section per criterion, each recording what you actually observed:

1. **Real faces within the first viewport** — load the homepage cold at desktop width. Are recognisable people visible above the fold? Yes/no plus a note.
2. **No two consecutive sections share a cadence** — list the actual rendered sequence.
3. **Hero runs steady on desktop, resolves instantly on mobile** — record frame rate from the DevTools Performance panel during the scrub, and confirm the mobile static state.
4. **No new runtime dependency** — run `git diff main -- package.json` and confirm the `dependencies` block is unchanged.
5. **Typecheck and build pass, all routes build** — paste the actual route count from the build output and compare against the 138 the project had before.
6. **Cadence components are reusable** — confirm none of the five imports anything from `src/app/`.

- [ ] **Step 2: Record the native-vs-GSAP finding**

State plainly whether native CSS scroll-driven animation was sufficient. If the scrub failed in a specific browser, name the browser and the failure. **Do not add GSAP in this task** — the finding is input to a separate decision by the user.

- [ ] **Step 3: Run the full verification**

```bash
npm run typecheck
npm run build
```

Expected: both PASS. If either fails, fix it before writing the findings — do not record a failing build as an acceptable outcome.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/plans/2026-09-03-occupied-findings.md
git commit -m "docs: record Occupied redirection verification findings"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Local scrims replace the blanket wash | Task 4 |
| Thumbnails through `next/image` | Tasks 1, 2, 3 |
| Art-directed crops from uncontrolled source | Tasks 1, 2 |
| Five-type cadence, no two consecutive alike | Tasks 5, 6, 8 |
| Extract sections from the 762-line `page.tsx` | Tasks 6, 8 |
| `Section`/`SectionHead` stay for unmigrated routes | Task 6 (File Structure: `ui.tsx` untouched) |
| Pinned hero, entry/scrub/handoff | Tasks 5, 7 |
| Native first, GSAP only on evidence | Global Constraints, Tasks 5, 7, 9 |
| Static mobile and reduced-motion floor | Tasks 5, 7 (Step 5), 8 |
| Editorial reveals below the hero | Tasks 5, 6 |
| No dark mode, no new typefaces, no new textures | Global Constraints |
| Data flow untouched | File Structure ("Leave alone") |
| All six success criteria | Task 9 |

No gaps.

**Placeholder scan:** No "TBD", no "add error handling", no "similar to Task N". Task 7 Step 2 and Task 8 Step 2 deliberately instruct the implementer to copy existing content verbatim rather than reproducing CCF's copy in this plan — the source is named with exact line numbers in both cases, and the transformation rules are enumerated explicitly. That is a read-then-transform instruction, not a placeholder.

**Type consistency:** `Crop` and `CROP` (Task 1) are consumed with those exact names in Tasks 2 and 6. `Frame`'s prop names (`src`, `alt`, `crop`, `className`, `preload`, `tone`, `children`) are used consistently in Tasks 3, 4, 6, 8. The cadence head props (`eyebrow`, `title`, `lead`, `action`) match the existing `SectionHead` signature verified in `src/components/ui.tsx`. `Hero`'s props match the existing call site in `HomePage`. The CSS class names in Task 5 (`.reveal`, `.bleed`, `.measure`, `.hero-stage`, `.hero-pin`, `.hero-media`, `.hero-panel`) are exactly those referenced in Tasks 6 and 7.

**Verified against the real codebase rather than assumed:**

- `Eyebrow` in `src/components/ui.tsx` declares `tone?: "clay" | "ink" | "paper"`, with `paper` mapping to `text-paper-bright/60`. Task 6's `Head` passing `tone="paper"` on dark grounds is valid as written.
- `Container`, `LiveDot`, `ButtonLink`, and `Pill` all exist in `src/components/ui.tsx` with the signatures Tasks 6 and 7 rely on.
- Gradient utilities use Tailwind 4's canonical `bg-linear-to-*`, not the deprecated `bg-gradient-to-*`. The one pre-existing gradient in `hero-backdrop.tsx:102` uses the legacy form and is deleted by Task 4 anyway.
- `next/image` prop names confirmed against the bundled docs: `preload`, not `priority`.
