<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# CCF Centris

The website for CCF Centris, a satellite of Christ's Commission Fellowship at
Eton Centris, Quezon City. It is live at `https://ccfcentris.org.ph` (since
2026-10-03; the old `ccf-centris.vercel.app` address redirects there).

Stack: Next.js 16 (App Router, React 19, React Compiler), TypeScript, Tailwind
v4, Supabase Postgres (data), Firebase Auth (member sign-in), Resend (email),
and Vercel (hosting).

## Commands

```
npm run dev              # local dev server
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run build            # production build
npm run test:content     # every src/**/*.test.ts (node:test via tsx), includes the RLS tests
npm run content:sync     # refresh the ccf.org.ph snapshot (see docs/content-sync.md)
npm run content:seed     # write an empty, correctly shaped snapshot
npm run seed:facilities  # seed Centris facilities into Supabase
npm run assets:check     # check files in public/
```

Run `typecheck` and `build` before calling work done. `page.e2e.test.mjs`
files aren't part of `test:content`. They fetch from a running server
(`NEW_HERE_PAGE_URL`, default `http://localhost:3001`).

For anything that writes to the database (admin actions, forms), test it end
to end against a local copy first: `scripts/local-db/start.sh` builds a
throwaway Postgres + PostgREST with every migration and seed events, and
prints the two `SUPABASE_*` lines for `.env.development.local` (add a local
`ADMIN_ACCESS_CODE`). Needs `brew install postgresql@16 postgrest`. Never
point local dev at the production database. For member flows (sign-in, My Dgroups,
bookings), also run the Firebase Auth emulator
(`npx firebase-tools emulators:start --only auth --project demo-ccf-centris`),
set `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-ccf-centris` and both
`*FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` locally, and create test
accounts there; leave `RESEND_API_KEY` empty so no real email goes out.

## Layout

- `src/app/`: routes. Server actions live in `src/app/actions/*`.
  `/admin/**` is the staff console, and `/my/**` holds member pages. Sign-in
  is handled by `/sign-in`, `/auth/finish` and `/auth/me`.
- `src/components/`: site components. `components/ui/` holds shadcn-derived
  primitives. Read its README before adding one. Call sites import the wrappers
  from `@/components/ui` (`ui.tsx`), not the folder.
- `src/lib/`: domain logic. The important seams:
  - `queries.ts`: the single seam between pages and storage. Pages read
    through it, not from `@/data` directly.
  - `supabase/server.ts`: `hasSupabase()` and `supabaseAdmin()`
    (service-role client, server only).
  - `auth/session.ts`: `currentUser()`, `hasAccounts()`, `memberHasRole()`.
    `auth/profile.ts` covers member profile reads and writes.
  - `firebase/admin.ts` (server) and `firebase/client.ts` (browser).
  - `admin-auth.ts`: the `/admin` shared-passcode gate.
  - `content/`: the ccf.org.ph sync (fetch, source policy, parsers, snapshot).
  - `watch.ts`, `ccf-net.ts`, `youtube*.ts`, `teaching-live.ts`: live
    video and replay data.
  - `email.ts`: sends through Resend and never throws.
- `src/data/`: hand-authored seed and demo data. `data/generated/public-content.json`
  is the synced snapshot.
- `supabase/migrations/`: numbered SQL migrations. They are append-only, so
  never edit or delete an applied one.
- `scripts/`: the TypeScript scripts behind the npm commands above. The `.py`
  files are a one-off crawl from 2026-09-03 whose output is in `docs/research/`.
- `docs/superpowers/`: past specs and plans. They record history and can
  lag the code.

## How data flows

The site degrades gracefully: every integration is optional, and a missing
one falls back instead of failing.

- **No Supabase env:** pages render from seed data in `src/data`, and the
  write forms are off.
- **With Supabase:** `queries.ts` reads Postgres, and the actions write
  reservations, inquiries, Dgroup table bookings and Prayer Wall posts.
- **Synced CCF content:** the committed snapshot JSON. A GitHub Action
  (`content-sync.yml`) refreshes it every 6 hours and commits
  `chore: refresh CCF content snapshot` straight to `main`. Don't hand-edit
  that file.
- **Video:** the channel RSS feed and the YouTube API (`YOUTUBE_API_KEY`)
  supply video, and CCF Net supplies replays. Replays are saved to
  `watch_replays`, which admins manage at `/admin/watch`. All of these calls
  fail soft.
- **Demo-content pages:** `next.config.ts` → `PARKED` sends pages that still
  run on invented demo content to real pages with 307 redirects. Their code is
  kept on purpose.

## Auth and trust boundaries

- **Members:** Firebase proves identity (email and password, or Google popup;
  the email must be confirmed). `/sign-up` creates accounts. The
  browser sends the ID token to `startSession` (`actions/auth.ts`), which
  finds or creates the profile (`link_firebase_member`) and sets the httpOnly
  `__session` Firebase session cookie. That cookie is the only thing the
  server trusts. There is no proxy/middleware. `/my/layout.tsx` gates member
  pages, and the header reads `/auth/me`.
- **Database access always uses the service role, which bypasses RLS.** Every
  member-facing query must scope itself to the member explicitly, for example
  `.eq("user_id", member.id)`, using the id from `currentUser()`, never an id
  from the request. RLS policies remain only to shut out anon-key access.
  `src/lib/db/rls.test.ts` runs every migration in PGlite and checks them.
- **Admin:** one shared passcode (`ADMIN_ACCESS_CODE`). The cookie stores its
  SHA-256 hash. Call `requireAdmin()` at the top of every `/admin` page and
  every mutating admin action. When the code is unset, the console is
  read-only.
- `import "server-only"` marks every module that touches secrets. Only
  `NEXT_PUBLIC_*` values reach the browser.

## Environment

`.env.example` lists every variable the code reads, with what happens when
it's unset. Copy it to `.env.local`. When you add a `process.env` read, add it
there too.

## Conventions

- **Styling:** Tailwind v4 with the theme in `src/app/globals.css`
  (`@theme inline`). There is no `tailwind.config.ts`. Use the CCF tokens
  (`paper`, `ink`, `clay`, `hairline`, `moss`, `sky`, …), not raw colours or
  shadcn's `hsl(var(--*))`. Manrope is the only typeface (design A, 2026-10-01).
  `DESIGN.md` covers the look (colour roles, surfaces, buttons, page anatomy)
  and the booking-flow pattern. Read it before building a page.
- **Content with no value yet:** it stays `null` in `src/lib/site.ts`, and the
  UI hides it rather than showing a placeholder.
- **Rendering:** pages opt in with `export const revalidate` / `dynamic`.
  Booking, availability and member pages are `force-dynamic`, and Watch pages
  revalidate.
- **Comments:** doc comments explain *why* and give dates for decisions. Match
  that density and plain tone.
- **Validation:** rules are shared between forms, actions and tests
  (`lib/validation.ts`, `lib/member.ts`, `lib/prayer-wall.ts`), and the
  database enforces the same limits.

## Deploys

- **Production:** Vercel's Git integration builds `main`.
  `deploy-to-vercel.yml` only builds PR previews. Don't make it deploy
  production. The reasons are in that file.
- **Workflow:** work lands on `main` through PRs from short-lived branches.
  The content bot pushes to `main` every 6 hours, so pull before pushing.
