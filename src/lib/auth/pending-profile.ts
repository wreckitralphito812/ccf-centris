/**
 * The name and mobile someone gave at sign-up, kept in this browser until
 * their first sign-in (after confirming their email) saves them to the
 * profile (2026-10-01). Another device simply asks for them on "About you".
 */
export interface PendingProfile {
  firstName: string;
  lastName: string;
  mobile: string;
}

const key = (email: string) => `ccf-signup:${email.trim().toLowerCase()}`;

export function rememberSignUp(email: string, p: PendingProfile) {
  try {
    localStorage.setItem(key(email), JSON.stringify(p));
  } catch {
    /* private mode: "About you" asks instead */
  }
}

export function recallSignUp(email: string): PendingProfile | null {
  try {
    const raw = localStorage.getItem(key(email));
    return raw ? (JSON.parse(raw) as PendingProfile) : null;
  } catch {
    return null;
  }
}

export function forgetSignUp(email: string) {
  try {
    localStorage.removeItem(key(email));
  } catch {
    /* nothing to clear */
  }
}
