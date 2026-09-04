/**
 * Human-quotable reference codes derived from a row's UUID.
 *
 * Deterministic: the same id always yields the same code, so a code printed on
 * a confirmation screen and one looked up later in admin agree. The first six
 * hex digits of a v4 UUID carry ~24 bits of entropy — plenty to quote over a
 * counter, and the full id remains the real key.
 */

export type ReferenceKind = "reservation" | "dgroup" | "volunteer";

const PREFIX: Record<ReferenceKind, string> = {
  reservation: "CTR",
  dgroup: "DG",
  volunteer: "VOL",
};

export function referenceFor(kind: ReferenceKind, id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, "").slice(0, 6).toUpperCase();
  return `${PREFIX[kind]}-${hex.padEnd(6, "0")}`;
}
