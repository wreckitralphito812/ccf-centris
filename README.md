# CCF Centris

The website for CCF Centris, a satellite of Christ's Commission Fellowship at
2/F Centris Station, Eton Centris, EDSA corner Quezon Avenue, Quezon City.

Live at <https://ccf-centris.vercel.app> until CCF's own domain is connected.

Built with Next.js 16 (App Router), React 19, TypeScript and Tailwind v4.
Data lives in Supabase Postgres, members sign in with Firebase Auth, email goes
out through Resend, and the site is hosted on Vercel.

## Getting started

```bash
npm install
cp .env.example .env.local   # every variable is optional; see below
npm run dev
```

Open <http://localhost:3000>.

With an empty `.env.local` the site still runs: pages render from the seed
data in `src/data`, and the forms, member accounts and admin actions switch
themselves off. Fill in the parts you need:

| To enable | Set |
| --- | --- |
| Reservations, inquiries, Dgroup bookings, Prayer Wall | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Member sign-in (needs Supabase too) | the `NEXT_PUBLIC_FIREBASE_*` and `FIREBASE_*` variables |
| Admin console at `/admin` | `ADMIN_ACCESS_CODE` |
| Booking confirmation emails | `RESEND_API_KEY`, `EMAIL_FROM` |
| YouTube API data | `YOUTUBE_API_KEY` |

`.env.example` explains each one.

### Supabase

Apply the migrations in `supabase/migrations/` in order, for example with the
Supabase CLI (`npx supabase db push`). They're append-only: add a new numbered
file rather than editing one that has been applied. Then
`npm run seed:facilities` loads the satellite, facilities, courts and add-ons
from `src/data/center.ts`. It's safe to re-run, and `-- --dry` previews it.

### Firebase

In the Firebase console, enable the **Email link (passwordless)** and
**Google** sign-in methods. Add each domain the site runs on (including
`localhost`) under Authentication → Settings → Authorized domains. The server
needs a service account key (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run test:content` | Unit tests (`src/**/*.test.ts`), including database policy tests against in-memory Postgres |
| `npm run content:sync` | Refresh the ccf.org.ph content snapshot ([docs/content-sync.md](docs/content-sync.md)) |
| `npm run content:seed` | Write an empty snapshot |
| `npm run seed:facilities` | Upsert the satellite, facilities, courts and add-ons into Supabase |
| `npm run assets:check` | Fail if a `/public` path referenced in `src` is missing |

## Deploying

Vercel's Git integration builds and deploys `main` to production. Pull
requests get a preview deployment from GitHub Actions
(`.github/workflows/deploy-to-vercel.yml`), with the URL posted on the PR.

A second workflow (`content-sync.yml`) refreshes the CCF content snapshot every
6 hours and commits it to `main` when it changes, so pull before you push.

## More

[AGENTS.md](AGENTS.md) covers the architecture, trust boundaries and code
conventions in more depth.
