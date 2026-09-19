/**
 * Rules for member details: names, and which email addresses we accept.
 *
 * Every account's email is proven before it exists: the sign-in link only
 * works for someone who can open that inbox, and Google and Facebook only hand
 * over addresses they have verified. What a link can't catch is a throwaway
 * inbox, so the common disposable-mail services are refused up front.
 */

/** Letters in any script, plus the spaces, hyphens, apostrophes and periods real names use. */
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

export function cleanName(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

/** A problem with a first name or surname, or null when it's fine. */
export function nameProblem(name: string, which: "first name" | "surname"): string | null {
  if (!name) return `Enter your ${which}.`;
  if (name.length > 60) return `Your ${which} can be up to 60 characters.`;
  if (!NAME.test(name)) return `Your ${which} can use letters, spaces, hyphens and apostrophes.`;
  return null;
}

/**
 * Best guess at first name and surname from one "name" string, used only to
 * prefill the form for the member to confirm. "Maria Clara Santos" guesses
 * "Maria Clara" + "Santos"; the member fixes it if that's wrong.
 */
export function splitName(full: string | null | undefined): { first: string; last: string } {
  const parts = cleanName(full).split(" ").filter(Boolean);
  if (parts.length < 2) return { first: parts[0] ?? "", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

/** Throwaway-inbox services. Not exhaustive; it stops the common ones. */
const DISPOSABLE = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com", "grr.la",
  "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org", "tempmail.net",
  "yopmail.com", "yopmail.net", "trashmail.com", "getnada.com", "nada.email", "dispostable.com",
  "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mintemail.com", "emailondeck.com",
  "moakt.com", "mohmal.com", "tempr.email", "tempinbox.com", "spamgourmet.com", "mailnesia.com",
  "burnermail.io", "mailpoof.com", "inboxkitten.com", "tmail.ws", "1secmail.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return DISPOSABLE.has(domain);
}
