import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * The Supabase seam.
 *
 * The site runs on static seed data until both variables below are set. Once
 * they are, `src/lib/queries.ts` reads from Postgres and the write actions in
 * `src/app/actions/*` insert real rows.
 *
 * We use the service-role key. There is no visitor session — reservations and
 * inquiries are submitted anonymously — so the trust boundary is the server
 * action itself (validation, and the admin cookie for mutations), not RLS.
 * The key is server-only; nothing here is ever bundled for the client.
 */

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** The CCF Centris satellite row. Seed data uses a fixed UUID; override per env. */
export const SATELLITE_ID =
  process.env.CENTRIS_SATELLITE_ID ?? "00000000-0000-0000-0000-0000000ce471";

export function hasSupabase(): boolean {
  return Boolean(url && serviceKey);
}

let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "supabaseAdmin() called without SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  client ??= createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
