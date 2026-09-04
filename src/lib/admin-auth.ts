import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Minimal admin gate: staff share one access code (`ADMIN_ACCESS_CODE`).
 * Honest for a pitch — no user accounts, no roles table. When the code is
 * unset, `/admin` renders read-only and mutations refuse.
 *
 * The cookie stores a SHA-256 of the code, never the code itself, so a leaked
 * cookie file does not reveal the passphrase. httpOnly + sameSite=lax.
 */

export const ADMIN_COOKIE = "admin_session";

const CODE = process.env.ADMIN_ACCESS_CODE;

export function isAdminConfigured(): boolean {
  return Boolean(CODE);
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** True if the current request carries a valid admin cookie. */
export async function isAdmin(): Promise<boolean> {
  if (!CODE) return false;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === hashCode(CODE);
}

/**
 * Call at the top of every `/admin/**` page and mutating admin action.
 * Redirects to `/admin` (which renders the sign-in form inline) when a code
 * is configured but absent/wrong. When no code is configured, returns
 * `{ readOnly: true }` so pages can render read-only.
 */
export async function requireAdmin(): Promise<{ readOnly: boolean }> {
  if (!CODE) return { readOnly: true };
  if (await isAdmin()) return { readOnly: false };
  redirect("/admin");
}
