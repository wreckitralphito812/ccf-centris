import "server-only";

import { hasSupabase } from "./server";

/**
 * Which third-party sign-in providers this Supabase project actually has
 * switched on.
 *
 * Asked at runtime rather than kept in a config flag on purpose. Enabling
 * Google is done in the Supabase dashboard, not in this repo, and a flag here
 * would be a second switch someone has to remember to flip — the sign-in page
 * would keep offering a button that returns
 * "Unsupported provider: provider is not enabled" until they did. Reading the
 * project's own settings means the button appears the moment the provider is
 * live and disappears if it is ever turned off.
 *
 * `/auth/v1/settings` is public (it takes the anon key) and its answer changes
 * about never, so it is cached for an hour. Any failure is treated as "not
 * enabled": email sign-in always works, so hiding a provider button is the
 * safe direction to fail.
 */
export interface AuthProviders {
  google: boolean;
}

const NONE: AuthProviders = { google: false };

export async function enabledAuthProviders(): Promise<AuthProviders> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!hasSupabase() || !url || !anon) return NONE;

  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anon },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return NONE;
    const body = (await res.json()) as { external?: Record<string, boolean> };
    return { google: body.external?.google === true };
  } catch {
    return NONE;
  }
}
