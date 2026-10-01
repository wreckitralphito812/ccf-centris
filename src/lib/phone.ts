/**
 * Philippine mobile numbers, written the way people say them: 0917 123 4567
 * (2026-10-01, Ralph's request for sign-up and bookings). Shared by the forms,
 * which format as you type, and the actions, which check again.
 */

/** Digits only, with +63 / 63 / a bare leading 9 turned into the local 09…. */
function localDigits(raw: string): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("63")) d = `0${d.slice(2)}`;
  else if (d.startsWith("9")) d = `0${d}`;
  return d.slice(0, 11);
}

/** As-you-type formatting: "0917", "0917 123", "0917 123 4567". */
export function formatPhMobile(raw: string): string {
  const d = localDigits(raw);
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 11)].filter(Boolean).join(" ");
}

/** "0917 123 4567" for a complete PH mobile number, else null. */
export function normalizePhMobile(raw: string): string | null {
  const d = localDigits(raw);
  return /^09\d{9}$/.test(d) ? formatPhMobile(d) : null;
}

/** Why a mobile number won't do, or null when it's fine. */
export function phMobileProblem(raw: string): string | null {
  if (!String(raw ?? "").trim()) return "Enter your mobile number.";
  return normalizePhMobile(raw) ? null : "Enter a mobile number like 0917 123 4567.";
}
