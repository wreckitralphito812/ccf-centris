/** Dates for the day-before reminder job (2026-09-30). Manila has no daylight saving. */
const H8 = 8 * 3_600_000;
const DAY = 86_400_000;

/** Tomorrow's date in Manila, "YYYY-MM-DD". */
export function manilaTomorrow(now: Date = new Date()): string {
  return new Date(now.getTime() + H8 + DAY).toISOString().slice(0, 10);
}

/** A Manila day as a UTC [from, to) range. */
export function manilaDayRange(date: string): { from: string; to: string } {
  const start = new Date(`${date}T00:00:00+08:00`).getTime();
  return { from: new Date(start).toISOString(), to: new Date(start + DAY).toISOString() };
}
