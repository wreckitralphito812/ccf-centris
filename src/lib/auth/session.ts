import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { firebaseAdminAuth, hasFirebase } from "@/lib/firebase/admin";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase/server";

/**
 * Who is signed in.
 *
 * Firebase proves identity; the proof is kept as a Firebase session cookie
 * (httpOnly, minted by `startSession`). Each request verifies that cookie and
 * looks up the member's profile by Firebase uid. Postgres is then read and
 * written with the service role, so every member-facing query must name the
 * member itself (`.eq("user_id", member.id)`): no database policy does it for
 * us any more.
 */

export const SESSION_COOKIE = "__session";

/** Firebase caps session cookies at two weeks. */
export const SESSION_MAX_AGE_S = 14 * 24 * 60 * 60;

export interface Member {
  /** The profile id: what every `user_id` / `author_id` column holds. */
  id: string;
  email: string;
  firebaseUid: string;
}

/** Member accounts need both Firebase (identity) and Supabase (profiles). */
export function hasAccounts(): boolean {
  return hasFirebase() && hasSupabase();
}

/** The signed-in member for this request, or null. Cached per request. */
export const currentUser = cache(async (): Promise<Member | null> => {
  if (!hasAccounts()) return null;
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  let uid: string;
  try {
    uid = (await firebaseAdminAuth().verifySessionCookie(cookie)).uid;
  } catch {
    return null; // expired, revoked, or not ours
  }

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, email")
    .eq("firebase_uid", uid)
    .maybeSingle();
  if (error) {
    console.error("currentUser: profile lookup failed", error);
    return null;
  }
  if (!data) return null;
  return { id: data.id as string, email: (data.email as string | null) ?? "", firebaseUid: uid };
});

/**
 * Whether a member holds one of `wanted` roles at a satellite: the same rule
 * as the database's `has_role()`, asked for a named member.
 */
export async function memberHasRole(
  memberId: string,
  satelliteId: string,
  wanted: string[],
): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("user_roles")
    .select("role, satellite_id")
    .eq("user_id", memberId)
    .in("role", wanted);
  if (error) {
    console.error("memberHasRole failed", error);
    return false;
  }
  return (data ?? []).some(
    (r) => r.role === "super_admin" || r.satellite_id === null || r.satellite_id === satelliteId,
  );
}
