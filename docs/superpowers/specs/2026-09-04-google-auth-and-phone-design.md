# Google sign-in + optional phone number on the sign-in page

**Date:** 2026-09-04
**Status:** Approved

## Goal

Add two things to `/sign-in`, alongside the existing magic-link (email OTP) flow:

1. A **"Continue with Google"** button — Supabase OAuth, Google provider.
2. An **optional phone number** field on the magic-link form, saved to
   `profiles.mobile` on first signup.

No SMS provider, no phone-based authentication, no new npm dependencies.

## Background

- `/sign-in` (`src/app/sign-in/page.tsx`) renders `PageHeader` + `SignInForm`.
- `SignInForm` (`sign-in-form.tsx`, client) is a `useActionState` form calling
  the `sendMagicLink` server action; on success it swaps to a "Check your
  email" `FormSuccess`.
- `sendMagicLink` (`src/app/actions/auth.ts`) calls
  `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo:
  ".../auth/callback?next=<next>" } })`.
- `/auth/callback/route.ts` exchanges the `code` for a session
  (`exchangeCodeForSession`) and redirects to `next` (same-origin only). This
  route already handles both magic-link and OAuth callbacks — the `code`
  param is identical.
- `profiles` already has a `mobile text` column (`0001_core.sql`).
- `handle_new_user()` trigger (`0003_profiles_on_signup.sql`) inserts
  `(id, email, full_name)` from `raw_user_meta_data` on `auth.users` insert,
  `on conflict (id) do nothing`.
- `createReservation` already falls back to `profiles.mobile` for contact
  details and lets a user type a mobile on the booking form.

## Design

### 1. Continue with Google

**New file `src/app/sign-in/google-button.tsx`** (`"use client"`):

- Renders a `Button` (`@/components/ui`) with `tone="outline"`, `size="lg"`,
  `full`, a small inline Google "G" SVG glyph, label "Continue with Google".
- Props: `{ next: string }`.
- On click:
  ```ts
  const supabase = createClient(); // from @/lib/supabase/client
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  ```
  `signInWithOAuth` performs a full-page redirect to Google, so no success
  state is needed. On error (rare — network), set a local `error` string and
  render it in the same clay error style the form uses.
- Disable the button while the redirect is in flight (local `pending` state).

**`src/app/sign-in/page.tsx`** — between `PageHeader` and the form area,
inside the existing `Container className="max-w-md"`:

```
<GoogleButton next={next} />
<div className="my-6 flex items-center gap-4">
  <span className="h-px flex-1 bg-hairline" />
  <span className="label text-ink-mute">or</span>
  <span className="h-px flex-1 bg-hairline" />
</div>
{one(sp.error) === "link" ? <existing link-error banner> : null}
<SignInForm next={next} />
```

Email stays first in reading order as the primary path; Google is the
one-click alternative above it. (Button on top, divider, form.)

**`supabase/config.toml`** — add after `[auth.external.apple]`:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
skip_nonce_check = true  # required for local sign in with Google
```

**Ops step (not code, noted here):** in the hosted Supabase project, enable
the Google provider and set the OAuth client ID/secret from Google Cloud
Console; add `<site>/auth/callback` to the Google authorized redirect URIs
and to Supabase's redirect allow-list. Until that's done the button will
bounce back to `/sign-in?error=...`; the magic-link flow is unaffected.

### 2. Optional phone field

**`src/app/sign-in/sign-in-form.tsx`** — add below the Email `Field`, before
the submit `Button`:

```tsx
<Field
  label="Phone"
  name="phone"
  hint="Optional — so we can reach you about a booking."
>
  {(p) => (
    <input
      {...p}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      className={controlClass}
    />
  )}
</Field>
```

Not `required`. No client-side validation beyond the browser default for
`type="tel"` (which is none) — an empty or messy value is acceptable.

**`src/app/actions/auth.ts` → `sendMagicLink`:**

- Read `phone`: `String(formData.get("phone") ?? "").trim()`.
- Normalize lightly: strip characters other than digits, spaces, `+`, `-`,
  `(`, `)`; collapse repeated whitespace. If the result is empty, treat as
  absent.
- Pass through as user metadata:
  ```ts
  options: {
    emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    data: phone ? { mobile: phone } : undefined,
  }
  ```
- No change to the return type or the success/error handling.

**New migration `supabase/migrations/0004_profile_mobile_on_signup.sql`:**

`create or replace function public.handle_new_user()` — same body as 0003 but
the insert also sets `mobile`:

```sql
insert into public.profiles (id, email, full_name, mobile)
values (
  new.id,
  new.email,
  nullif(new.raw_user_meta_data ->> 'full_name', ''),
  nullif(new.raw_user_meta_data ->> 'mobile', '')
)
on conflict (id) do nothing;
```

The trigger itself is unchanged (already `after insert on auth.users`); only
the function is redefined. Keep the `handle_user_email_change` function and
its trigger from 0003 as-is (don't redefine them).

## Known limitations (accepted)

- **First-signup only.** `data.mobile` lands on the profile row only when the
  `handle_new_user` trigger fires — i.e. the first time an email signs up.
  A returning user who types a *new* phone number in the form will not have
  `profiles.mobile` updated. That belongs to a profile-edit screen under
  `/my`, which does not exist yet and is out of scope.
- **Google sign-in collects no phone.** The OAuth flow has no phone field.
- Both gaps are non-blocking: the reservation flow already lets a user enter
  a mobile at booking time and falls back to `profiles.mobile` when present.

## Files touched

| File | Change |
|---|---|
| `src/app/sign-in/google-button.tsx` | new — client OAuth button |
| `src/app/sign-in/page.tsx` | render button + "or" divider above `SignInForm` |
| `src/app/sign-in/sign-in-form.tsx` | add optional Phone `Field` |
| `src/app/actions/auth.ts` | normalize `phone`, pass as `data.mobile` |
| `supabase/migrations/0004_profile_mobile_on_signup.sql` | new — `handle_new_user` also reads `mobile` metadata |
| `supabase/config.toml` | add `[auth.external.google]` block |

No changes to `/auth/callback`. No new dependencies. No SMS provider.

## Testing

- `npm run typecheck` and `npm run build` clean.
- Manual: with Supabase configured locally, magic-link flow still works;
  phone value round-trips into `raw_user_meta_data` (inspect the OTP request
  / a test signup). Google button initiates the OAuth redirect (full flow
  needs the provider configured).
- If `hasSupabase()` is false, `sendMagicLink` still returns the
  "not available in this environment" `formError` and the Google button's
  `createClient()` call is never reached in a way that throws before click
  (guard: if the env vars are missing, the button can be rendered disabled —
  optional, only if `page.tsx` already knows via `hasSupabase()`; it does).
