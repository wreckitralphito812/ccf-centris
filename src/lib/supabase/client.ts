"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for the browser. Uses the public anon key and the user's
 * session cookie, so every query runs under that user's row-level security.
 * Never import this from server code — use `./ssr` or `./server` there.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
