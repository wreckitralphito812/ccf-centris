# Calm reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the four reservation pages the calm, Calendly-inspired look from the spec. Add "Book again" and a reminder email sent the day before.

**Architecture:** The look lives in a few classes in `globals.css` and in the shared pieces in `src/components/booking.tsx`, so both flows and My reservations draw from one kit. Rules that can be tested on their own (status labels, "when" labels, merging bookings, the Book again date, which reminders are due) go in small modules under `src/lib`, with `node:test` tests. It ships as three PRs, merged in order.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind v4 (`@theme inline`), Supabase (service role), Resend, Vercel Cron. Tests use `node:test` via `tsx` (`npm run test:content`).

Spec: `docs/superpowers/specs/2026-09-30-calm-reservations-design.md`.

Conventions:
- Run `npm run typecheck`, `npx eslint <changed files>`, `npm run test:content` and `npm run build` before each PR.
- Visual checks go through a temporary `src/app/zzpreview/*` page, which is never committed.
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## File map

| File | PR | Responsibility |
|---|---|---|
| `src/app/globals.css` | 1 | `--mist`, `--rule` tokens; `.calm-card`, `.calm-input` |
| `src/components/icons.tsx` | 1 | `UiIcon`: calendar, clock, people, pin, check, chevron |
| `src/lib/booking-status.ts` (+ test) | 1 | Status label and tone; the "Today / Tomorrow / In N days" label |
| `src/lib/my-bookings.ts` (+ test) | 1 | Merge Dgroup tables and room reservations into one upcoming list |
| `src/components/booking.tsx` | 1 | Calm `choiceClass`, `Question`, `StepButton`, `BookingBar`, plus new `DayCircle`, `StatusBadge`, `IconLine`, `Confirmation` |
| `src/app/reserve/page.tsx` | 1 | Booking-type cards and "Your next booking" |
| `src/lib/queries.ts` | 1 | `getMyUpcoming()` (tables + rooms, merged) |
| `src/app/reserve/dgroup/booking-form.tsx`, `page.tsx` | 1 | Calm Dgroup flow and confirmation |
| `src/app/centris/reserve/booking.tsx`, `page.tsx` | 1 | Calm room flow and confirmation |
| `DESIGN.md` | 1 | "Calm booking look" section |
| `src/lib/dgroup-tables.ts` (+ test) | 2 | `rebookDate()` |
| `src/app/actions/dgroup-tables.ts` | 2 | `bookTables()` shared path; `rebookDgroupTable()` |
| `src/app/my/reservations/page.tsx`, `next-up.tsx`, `booking-row.tsx`, `book-again.tsx` | 2 | My reservations rebuild |
| `supabase/migrations/0013_booking_reminders.sql` | 3 | `reminder_sent_at` columns |
| `src/lib/reminders.ts` (+ test) | 3 | Tomorrow's Manila date; which rows are due |
| `src/lib/emails/dgroup-booking.ts`, `room-request.ts` | 3 | The `reminder` email kind |
| `src/app/api/cron/reminders/route.ts` | 3 | The cron endpoint |
| `vercel.json`, `.env.example` | 3 | Cron schedule; `CRON_SECRET` |

---

# PR 1: Calm look and flows (branch `feat/calm-booking-look`)

### Task 1: Tokens and calm classes

**Files:** Modify `src/app/globals.css`

- [ ] **Step 1: Add tokens** inside `:root`, after `--bone`:

```css
  /* Calm booking ground and rule (design review 2026-09-30): one step lighter
     than --paper, and the faint line between questions. */
  --mist: #f7f9f9;
  --rule: #edf2f3;
```

and inside `@theme inline`, after `--color-bone`:

```css
  --color-mist: var(--mist);
  --color-rule: var(--rule);
```

- [ ] **Step 2: Add classes** inside the existing `@layer components { … }` block, after `.photo`:

```css
/* The calm booking card (Calendly-inspired, 2026-09-30): no border, big soft
   corners, a teal-tinted shadow in three layers. */
.calm-card {
  background: var(--paper-bright);
  border-radius: 1.5rem;
  box-shadow:
    0 1px 2px rgb(0 95 104 / 0.04),
    0 8px 24px -8px rgb(0 95 104 / 0.08),
    0 30px 60px -30px rgb(0 95 104 / 0.12);
}

/* Inputs in the booking flows: filled, borderless, teal ring on focus. */
.calm-input {
  width: 100%;
  border-radius: 0.875rem;
  background: var(--mist);
  padding: 0.95rem 1.1rem;
  font-size: 1.05rem;
  color: var(--ink);
  box-shadow: inset 0 0 0 1px transparent;
  transition: box-shadow 150ms var(--ease), background-color 150ms var(--ease);
}
.calm-input:focus {
  outline: none;
  background: var(--paper-bright);
  box-shadow: inset 0 0 0 2px var(--clay);
}
```

- [ ] **Step 3:** Run `npm run build 2>&1 | grep -iE "error|compiled"`. Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit** `git add src/app/globals.css && git commit -m "style: calm booking tokens and card"`

### Task 2: Line icons

**Files:** Modify `src/components/icons.tsx` (append)

- [ ] **Step 1: Append**

```tsx
/**
 * Line icons for the booking pages (2026-09-30): 1.5px stroke, round caps,
 * currentColor. They replace emoji and text arrows in facts and details.
 */
export type UiIconName = "calendar" | "clock" | "people" | "pin" | "check" | "chevron-right" | "chevron-left";

export function UiIcon({ name, className = "h-[18px] w-[18px]" }: { name: UiIconName; className?: string }) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
  switch (name) {
    case "calendar":
      return (<svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>);
    case "clock":
      return (<svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
    case "people":
      return (<svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.6.8 2.7 2.5 3 5.2" /></svg>);
    case "pin":
      return (<svg {...p}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>);
    case "check":
      return (<svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>);
    case "chevron-right":
      return (<svg {...p}><path d="M9 5l7 7-7 7" /></svg>);
    case "chevron-left":
      return (<svg {...p}><path d="M15 5l-7 7 7 7" /></svg>);
  }
}
```

- [ ] **Step 2:** `npm run typecheck`. Expected: no output after the header.
- [ ] **Step 3: Commit** `git commit -am "feat: line icons for the booking pages"`

### Task 3: Status and "when" labels

**Files:** Create `src/lib/booking-status.ts`, `src/lib/booking-status.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { statusBadge, whenLabel } from "./booking-status";

test("statuses read in plain words with CCF tones", () => {
  assert.deepEqual(statusBadge("approved"), { label: "Confirmed", tone: "ok" });
  assert.deepEqual(statusBadge("confirmed"), { label: "Confirmed", tone: "ok" });
  assert.deepEqual(statusBadge("pending"), { label: "Awaiting approval", tone: "wait" });
  assert.deepEqual(statusBadge("rejected"), { label: "Declined", tone: "grey" });
  assert.deepEqual(statusBadge("cancelled"), { label: "Cancelled", tone: "grey" });
  assert.deepEqual(statusBadge("weird"), { label: "weird", tone: "grey" });
});

test("when a booking is, counted in Manila days", () => {
  assert.equal(whenLabel("2026-10-07", "2026-10-07"), "Today");
  assert.equal(whenLabel("2026-10-08", "2026-10-07"), "Tomorrow");
  assert.equal(whenLabel("2026-10-10", "2026-10-07"), "In 3 days");
  assert.equal(whenLabel("2026-10-13", "2026-10-07"), "In 6 days");
  assert.equal(whenLabel("2026-10-14", "2026-10-07"), "Wed, Oct 14");
});
```

- [ ] **Step 2:** `npx tsx --test src/lib/booking-status.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
/**
 * Plain words and tones for booking statuses, and how soon a booking is.
 * Shared by /reserve, My reservations and the confirmations (2026-09-30).
 * Tones map to CCF colours: ok = teal, wait = maroon, grey = muted.
 */
export type BadgeTone = "ok" | "wait" | "grey";

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  approved: { label: "Confirmed", tone: "ok" },
  confirmed: { label: "Confirmed", tone: "ok" },
  pending: { label: "Awaiting approval", tone: "wait" },
  rejected: { label: "Declined", tone: "grey" },
  cancelled: { label: "Cancelled", tone: "grey" },
  completed: { label: "Done", tone: "grey" },
};

export function statusBadge(status: string): { label: string; tone: BadgeTone } {
  return STATUS[status] ?? { label: status, tone: "grey" };
}

const DAY = 86_400_000;
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const utc = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** "Today", "Tomorrow", "In 3 days", or "Wed, Oct 14" a week or more out. Both dates Manila "YYYY-MM-DD". */
export function whenLabel(date: string, today: string): string {
  const days = Math.round((utc(date) - utc(today)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  const d = new Date(utc(date));
  return `${WEEKDAY[d.getUTCDay()]}, ${MONTH[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
```

- [ ] **Step 4:** Rerun the test. Expected: PASS (2 tests).
- [ ] **Step 5: Commit** `git add src/lib/booking-status* && git commit -m "feat: plain status and when labels for bookings"`

### Task 4: One upcoming list

**Files:** Create `src/lib/my-bookings.ts`, `src/lib/my-bookings.test.ts`. Modify `src/lib/queries.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { mergeUpcoming } from "./my-bookings";

const table = { id: "t1", room_slug: "welcome-center", table_labels: ["4", "5"], booked_on: "2026-10-07", slot_id: "1600", group_size: 6 };
const room = (id: string, status: string, starts: string, ends: string) => ({
  id, facility_name: "John (MPH 1)", court_name: null, activity_name: "Huddle", starts_at: starts, ends_at: ends, status, participants: 60, created_at: "",
});

test("tables and rooms merge into one list, soonest first", () => {
  const list = mergeUpcoming(
    [table],
    [room("r1", "pending", "2026-10-06T01:00:00Z", "2026-10-06T04:00:00Z"), room("r2", "approved", "2026-10-10T01:00:00Z", "2026-10-10T04:00:00Z")],
    new Date("2026-10-05T00:00:00Z"),
  );
  assert.deepEqual(list.map((b) => b.id), ["r1", "t1", "r2"]);
  assert.equal(list[1].kind, "table");
  assert.equal(list[1].date, "2026-10-07");
  assert.equal(list[1].title, "Tables 4 + 5 · Welcome Center");
  assert.equal(list[1].status, "confirmed");
  assert.equal(list[0].date, "2026-10-06"); // 09:00 Manila
});

test("finished, declined and cancelled rooms are left out", () => {
  const list = mergeUpcoming(
    [],
    [room("old", "approved", "2026-10-01T01:00:00Z", "2026-10-01T04:00:00Z"), room("no", "rejected", "2026-10-09T01:00:00Z", "2026-10-09T04:00:00Z"), room("x", "cancelled", "2026-10-09T01:00:00Z", "2026-10-09T04:00:00Z")],
    new Date("2026-10-05T00:00:00Z"),
  );
  assert.equal(list.length, 0);
});
```

- [ ] **Step 2:** `npx tsx --test src/lib/my-bookings.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/lib/my-bookings.ts`

```ts
/**
 * A member's upcoming bookings of every kind as one list, soonest first: the
 * "Your next booking" card on /reserve and My reservations (2026-09-30).
 * Pure, so the rules are testable; queries.ts supplies the rows.
 */
import { DGROUP_SLOTS, roomName, slotLabel, tablesLabel } from "@/lib/dgroup-tables";

export interface TableRow {
  id: string;
  room_slug: string;
  table_labels: string[];
  booked_on: string;
  slot_id: string;
  group_size: number;
}

export interface RoomRow {
  id: string;
  facility_name: string | null;
  court_name: string | null;
  activity_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  participants: number;
}

export interface Upcoming {
  id: string;
  kind: "table" | "room";
  /** Manila "YYYY-MM-DD". */
  date: string;
  /** For ordering: UTC ms of the start. */
  startsAt: number;
  title: string;
  /** "4:00 – 6:30 PM" */
  time: string;
  people: number;
  status: string;
  /** The row it came from, for actions. */
  table?: TableRow;
  room?: RoomRow;
}

const manilaKey = (ms: number) => new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10);
const manilaTime = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

export function mergeUpcoming(tables: TableRow[], rooms: RoomRow[], now: Date = new Date()): Upcoming[] {
  const fromTables: Upcoming[] = tables.map((t) => {
    const start = DGROUP_SLOTS.find((s) => s.id === t.slot_id)?.start ?? "13:00";
    return {
      id: t.id,
      kind: "table",
      date: t.booked_on,
      startsAt: new Date(`${t.booked_on}T${start}:00+08:00`).getTime(),
      title: `${tablesLabel(t.table_labels)} · ${roomName(t.room_slug)}`,
      time: slotLabel(t.slot_id),
      people: t.group_size,
      status: "confirmed",
      table: t,
    };
  });
  const fromRooms: Upcoming[] = rooms
    .filter((r) => (r.status === "pending" || r.status === "approved") && new Date(r.ends_at).getTime() > now.getTime())
    .map((r) => {
      const s = new Date(r.starts_at).getTime();
      return {
        id: r.id,
        kind: "room",
        date: manilaKey(s),
        startsAt: s,
        title: r.activity_name ?? r.facility_name ?? "Room booking",
        time: `${manilaTime(s)} – ${manilaTime(new Date(r.ends_at).getTime())}`,
        people: r.participants,
        status: r.status,
        room: r,
      };
    });
  return [...fromTables, ...fromRooms].sort((a, b) => a.startsAt - b.startsAt);
}
```

- [ ] **Step 4:** Rerun. Expected: PASS (2 tests).

- [ ] **Step 5: Add the query** to `src/lib/queries.ts`, after `getMyDgroupBookings`:

```ts
/** Every upcoming booking the member has, tables and rooms, soonest first. */
export async function getMyUpcoming(today: string): Promise<Upcoming[]> {
  const [tables, rooms] = await Promise.all([getMyDgroupBookings(today), getMyBookings()]);
  return mergeUpcoming(tables, rooms);
}
```

Also add `import { mergeUpcoming, type Upcoming } from "@/lib/my-bookings";` beside the other `@/lib` imports.

- [ ] **Step 6:** `npm run typecheck`, then `git add src/lib/my-bookings* src/lib/queries.ts && git commit -m "feat: one upcoming list for tables and rooms"`

### Task 5: Calm shared booking pieces

**Files:** Modify `src/components/booking.tsx`

- [ ] **Step 1: Replace `choiceClass`** with the calm version:

```tsx
/** A choice row's look: soft grey edge, solid teal when chosen, faded when it can't be picked. */
export function choiceClass(on: boolean, disabled = false) {
  return cx(
    "rounded-[0.875rem] border transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay has-[:focus-visible]:ring-offset-2",
    disabled
      ? "cursor-not-allowed border-rule bg-mist text-ink-mute"
      : on
        ? "cursor-pointer border-clay bg-clay text-paper-bright"
        : "cursor-pointer border-[#dfe8e9] bg-paper-bright text-ink hover:border-clay/50",
  );
}
```

- [ ] **Step 2: Replace `Question`.** Drop the number circle, use calm type, and use a soft rule between questions:

```tsx
/** One question in a booking card. Its heading (by `id`) labels the choices inside. */
export function Question({
  id, title, note, error, level = 3, children,
}: {
  id: string; title: string; note?: ReactNode; error?: string; level?: 2 | 3; children: ReactNode;
}) {
  const H = level === 2 ? "h2" : "h3";
  return (
    <section className="border-t border-rule py-8 first:border-t-0 first:pt-0 last:pb-0">
      <H id={id} tabIndex={-1} className="scroll-mt-28 text-[1.2rem] font-semibold leading-tight tracking-[-0.01em] text-ink outline-none">
        {title}
      </H>
      {note ? <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-mute">{note}</p> : null}
      <div className="mt-5">{children}</div>
      <FieldError text={error} />
    </section>
  );
}
```

Remove the `n` prop from every call site (`booking-form.tsx`, `centris/reserve/booking.tsx`).

- [ ] **Step 3: Calm `StepButton`, `countInputClass`, `barButtonClass` and `BookingBar`:**

```tsx
// StepButton className:
"btn-press grid h-[3.25rem] w-[3.25rem] shrink-0 place-items-center rounded-full border border-[#dfe8e9] bg-paper-bright text-2xl text-clay transition-colors hover:border-clay disabled:text-ink-mute/40 disabled:hover:border-[#dfe8e9]"

export const countInputClass =
  "h-[3.25rem] w-[4.5rem] rounded-[0.875rem] bg-mist text-center text-[1.5rem] font-semibold tabular-nums text-ink focus:bg-paper-bright focus:outline-none focus:ring-2 focus:ring-clay";

export const barButtonClass =
  "btn-press shrink-0 rounded-full bg-clay px-7 py-4 text-[1rem] font-semibold text-paper-bright shadow-[0_8px_20px_-8px_rgba(0,118,130,0.55)] transition-colors hover:bg-clay-deep disabled:cursor-not-allowed disabled:bg-ink/10 disabled:text-ink-mute disabled:shadow-none";

// BookingBar outer div className:
"fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper-bright/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
// and the inner row padding: "px-5 py-4 sm:px-8"
```

- [ ] **Step 4: Add `DayCircle`, `StatusBadge`, `IconLine`, `CalmChip`:**

```tsx
/** A day as a date circle (Calendly-style): weekday over the date, and a note under it. */
export function DayCircle({
  name, value, weekday, day, on, disabled, note, onChange,
}: {
  name: string; value: string; weekday: string; day: string | number; on: boolean; disabled?: boolean; note?: string; onChange: () => void;
}) {
  return (
    <label className={cx("group flex flex-col items-center gap-2 text-center", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
      <span className="text-[0.75rem] font-semibold tracking-[0.06em] text-ink-mute uppercase">{weekday}</span>
      <input type="radio" name={name} value={value} checked={on} disabled={disabled} onChange={onChange} className="peer sr-only" />
      <span
        className={cx(
          "grid h-12 w-12 place-items-center rounded-full text-[1.05rem] font-semibold tabular-nums transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-clay peer-focus-visible:ring-offset-2",
          disabled ? "text-ink-mute/45" : on ? "bg-clay text-paper-bright shadow-[0_6px_14px_-4px_rgba(0,118,130,0.45)]" : "bg-[#e9f4f5] text-clay group-hover:bg-clay/15",
        )}
      >
        {day}
      </span>
      <span className="h-4 text-[0.72rem] text-ink-mute">{note ?? ""}</span>
    </label>
  );
}

const BADGE = { ok: "bg-[#e9f4f5] text-clay-deep", wait: "bg-[#f8ecf0] text-sky", grey: "bg-[#eef2f3] text-ink-mute" } as const;

export function StatusBadge({ tone, children }: { tone: keyof typeof BADGE; children: ReactNode }) {
  return <span className={cx("inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[0.8rem] font-medium", BADGE[tone])}>{children}</span>;
}

/** One fact with its icon: "📅 Wednesday, Oct 7" without the emoji. */
export function IconLine({ icon, children }: { icon: UiIconName; children: ReactNode }) {
  return (
    <p className="flex items-start gap-3 text-[1rem] leading-snug text-ink-soft">
      <UiIcon name={icon} className="mt-0.5 h-[18px] w-[18px] shrink-0 text-clay" />
      <span>{children}</span>
    </p>
  );
}

/** A soft pill choice (set-up, food): a radio inside a label. */
export const calmChipClass = (on: boolean) =>
  cx(
    "inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border px-5 text-[1rem] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay",
    on ? "border-clay bg-clay text-paper-bright" : "border-[#dfe8e9] bg-paper-bright text-ink hover:border-clay/50",
  );
```

Add `import { UiIcon, type UiIconName } from "./icons";` at the top.

- [ ] **Step 5: Add the `Confirmation` shell:**

```tsx
/** The centred "You're booked" / "Request sent" card both flows end on. */
export function Confirmation({
  title, note, children, focusRef,
}: {
  title: string; note: ReactNode; children: ReactNode; focusRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div ref={focusRef} tabIndex={-1} role="status" className="calm-card mx-auto max-w-[35rem] px-7 py-10 text-center outline-none sm:px-10">
      <span aria-hidden className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-clay text-paper-bright shadow-[0_8px_20px_-8px_rgba(0,118,130,0.55)]">
        <UiIcon name="check" className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <p className="mt-2 text-[1rem] text-ink-mute">{note}</p>
      <div className="mt-8 space-y-6 border-t border-rule pt-7 text-left">{children}</div>
    </div>
  );
}
```

- [ ] **Step 6: Make `AddToCalendar` calm.** The Google button becomes solid (`bg-clay text-paper-bright`) and "Apple or Outlook" becomes the outline, both `rounded-full min-h-12 px-5`. Drop the "Add it to your calendar" label when inside `Confirmation` by giving it a `bare` prop (`bare ? null : <p>…</p>`).

- [ ] **Step 7:** `npm run typecheck`. It fails where `Question` still gets `n`; Tasks 7–8 fix those call sites. Commit once those tasks compile.

### Task 6: `/reserve` landing

**Files:** Modify `src/app/reserve/page.tsx`

- [ ] **Step 1: Rewrite the body.** Keep `PageHeader`. The section uses `tone="paper"` with `className="bg-mist"`, `Container className="max-w-5xl"`.

```tsx
export const dynamic = "force-dynamic";

const OPTIONS = [
  { title: "Dgroup table", badge: "Mon–Fri", href: "/reserve/dgroup", cta: "Book a table",
    facts: [["clock", "2½ hours, from 1, 4 or 7 PM"], ["people", `Up to ${MAX_GROUP_SIZE} people`], ["check", "Confirmed at once"]] },
  { title: "Ministry room", badge: "Mon–Sat", href: "/centris/reserve", cta: "Request a room",
    facts: [["clock", "9:00 AM to 9:30 PM"], ["people", "Rooms for 36 to 90"], ["check", "The facilities team confirms"]] },
] as const;

export default async function ReservePage() {
  const user = hasAccounts() ? await currentUser() : null;
  const next = user ? (await getMyUpcoming(manilaDateKey()))[0] : undefined;
  return (
    <>
      <PageHeader eyebrow="Reserve" title="What would you like to book?" lead="Use a space at CCF Centris for your Dgroup or your ministry." />
      <Section className="bg-mist">
        <Container className="max-w-5xl">
          {next ? (
            <Link href="/my/reservations" className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] bg-night px-7 py-6 text-paper-bright">
              <span>
                <span className="block text-[0.8rem] font-semibold tracking-[0.08em] text-paper-bright/70 uppercase">Your next booking</span>
                <span className="mt-1 block text-[1.1rem] font-semibold">{next.title} · {whenLabel(next.date, manilaDateKey())}, {next.time.split(" – ")[0]}</span>
              </span>
              <span className="text-[0.95rem] font-semibold text-clay-lift">Manage</span>
            </Link>
          ) : null}
          <ul className="grid gap-6 md:grid-cols-3">
            {OPTIONS.map((o) => (
              <li key={o.title} className="calm-card flex flex-col p-8">
                <StatusBadge tone="ok">{o.badge}</StatusBadge>
                <h2 className="mt-4 text-[1.4rem] font-semibold tracking-[-0.01em] text-ink">{o.title}</h2>
                <div className="mt-4 space-y-2.5">{o.facts.map(([i, t]) => <IconLine key={t} icon={i}>{t}</IconLine>)}</div>
                <div className="mt-auto pt-8"><ButtonLink href={o.href} size="lg">{o.cta}</ButtonLink></div>
              </li>
            ))}
            <li className="calm-card flex flex-col p-8 opacity-70">
              <StatusBadge tone="grey">Soon</StatusBadge>
              <h2 className="mt-4 text-[1.4rem] font-semibold text-ink-mute">The court</h2>
              <p className="mt-4 text-[1rem] text-ink-mute">Basketball and pickleball bookings open after launch.</p>
            </li>
          </ul>
          <p className="mt-10 text-center text-[1rem] text-ink-soft">
            Already booked? <Link href="/my/reservations" className="font-semibold text-clay underline-offset-4 hover:underline">See your reservations</Link>
          </p>
        </Container>
      </Section>
    </>
  );
}
```

Imports: `currentUser`, `hasAccounts` from `@/lib/auth/session`; `getMyUpcoming` from `@/lib/queries`; `manilaDateKey` from `@/lib/format`; `whenLabel` from `@/lib/booking-status`; `MAX_GROUP_SIZE` from `@/lib/dgroup-tables`; `IconLine`, `StatusBadge` from `@/components/booking`; `ButtonLink` from `@/components/ui`.

- [ ] **Step 2:** Check that `Section` accepts `className`: `grep -n "className" src/components/ui.tsx | sed -n 1,5p`. If it doesn't, wrap the content in a `div className="bg-mist"`.
- [ ] **Step 3:** Typecheck and view the page in a preview. Commit `feat: calm /reserve with booking-type cards and your next booking`.

### Task 7: Calm Dgroup flow and confirmation

**Files:** Modify `src/app/reserve/dgroup/booking-form.tsx`, `src/app/reserve/dgroup/page.tsx`

- [ ] **Step 1:** Wrap the questions in `<div className="calm-card px-6 py-8 sm:px-9 sm:py-10">`. Remove `n={…}` from each `Question`.
- [ ] **Step 2: Days become `DayCircle`s** in a `grid gap-2` with `gridTemplateColumns: repeat(min(n,5), minmax(0,1fr))`:

```tsx
{nights.map((n) => {
  const [day, rest] = shortNight(n.label).split(", ");
  const full = dayFull(n);
  return (
    <DayCircle key={n.date} name="date" value={n.date} weekday={day} day={rest.split(" ")[1]}
      on={date === n.date} disabled={full} note={full ? "Full" : undefined} onChange={() => setDate(n.date)} />
  );
})}
```

The note under the question becomes "This week, Monday to Friday. Next week opens Sunday." `rest` is "Oct 5", so the circle shows "5".

- [ ] **Step 3: Time rows.** Use `choiceClass(on, !ok)` with `px-5 py-4 min-h-[3.75rem]`. Label `text-[1.05rem] font-semibold`. `SlotStatus` tones: free → `text-moss` (or `text-paper-bright/85` when `on`), few left → `font-semibold text-clay-deep` (or `text-paper-bright` when `on`), full → `text-ink-mute`. Pass `on` into `SlotStatus`, which already has it.
- [ ] **Step 4: Headcount:** `StepButton` and `countInputClass` already calm (Task 5). The note becomes "Including you, up to 12."
- [ ] **Step 5: Details:** in `ContactFields` (booking.tsx), the folded card becomes `rounded-2xl bg-mist px-5 py-4` (not `.surface`). The open inputs use `calm-input` via `Field`'s child className (replace `controlClass` with `"calm-input"`). The policy checkbox is `h-6 w-6 rounded-md accent-clay`.
- [ ] **Step 6: Confirmation:** replace the success block with:

```tsx
<Confirmation
  focusRef={doneRef}
  title="You're booked"
  note={b.emailed ? `We've emailed the details to ${b.email}.` : `Saved. We couldn't email ${b.email} just now.`}
>
  <div className="space-y-3">
    <p className="text-[1.3rem] font-semibold text-ink">{b.tables} · {b.roomName}</p>
    <IconLine icon="calendar">{b.night}</IconLine>
    <IconLine icon="clock">{b.slot}</IconLine>
    <IconLine icon="people">{b.groupSize} {b.groupSize === 1 ? "person" : "people"}</IconLine>
    <IconLine icon="pin">{SITE.addressLines.slice(0, 2).join(", ")}</IconLine>
  </div>
  <div className="overflow-hidden rounded-2xl bg-mist p-4"><FloorPlanDrawing room={b.roomSlug} highlight={b.labels} width={440} /></div>
  <AddToCalendar bare event={dgroupEvent({ date: b.date, slotId: b.slotId, roomSlug: b.roomSlug, labels: b.labels })} />
  <p className="flex flex-wrap gap-x-6 gap-y-2 text-[0.98rem]">
    <button type="button" onClick={onAnother} className="font-semibold text-clay hover:underline">Book another time</button>
    <Link href="/my/reservations" className="font-semibold text-clay hover:underline">My reservations</Link>
  </p>
</Confirmation>
```

(PR 2 adds the "Book the same time next week" link here.)
- [ ] **Step 7: Page:** in `page.tsx`, the booking section wraps in a `bg-mist` band. The "Your upcoming tables" list is replaced by one `calm-card` row, "You have N upcoming tables", with "See them" → `/my/reservations`. That drops `MyBooking` and `FloorPlanDrawing` from this page, and stops fetching the change-form data here. The `Notice` blocks become `calm-card p-7`.
- [ ] **Step 8:** Typecheck, then do a visual check at 375 and 1280 via `src/app/zzpreview/dgroup/page.tsx`, rendering `BookingForm` with sample nights as before. Commit `feat: calm Dgroup booking flow and confirmation`.

### Task 8: Calm room flow and confirmation

**Files:** Modify `src/app/centris/reserve/booking.tsx`, `src/app/centris/reserve/page.tsx`

- [ ] **Step 1:** Wrap each step's questions in `calm-card px-6 py-8 sm:px-9 sm:py-10` (step 1: day, time, people, room; step 2: event, extras, you). Keep the "Step N of 2" eyebrow and title above the card. Remove `n={…}`.
- [ ] **Step 2: Days:** use a `grid grid-cols-6 gap-1` of `DayCircle` (`name="day"`, weekday `WEEKDAY[weekdayOf(d)]`, `day={dayNum(d)}`, `disabled={past}`, `note={past ? "Past" : undefined}`). The week header is the month label plus round `ArrowButton`s (already round, 48px).
- [ ] **Step 3: Time blocks and rooms:** use `choiceClass(on, !ok)`. Sub-labels are `text-ink-mute`, or `text-paper-bright/85` when `on`. On a chosen room card, the check square turns white with teal (`bg-paper-bright text-clay`). The room status tones are free → `text-moss`, warn → `text-clay-deep`, muted → `text-ink-mute`, each with an `on` override to `text-paper-bright`.
- [ ] **Step 4: Chips:** set-up and food use `calmChipClass(on)`, replacing `CHIP`/`CHIP_ON`/`CHIP_OFF`. `EquipmentChip` keeps its behaviour and uses `calmChipClass(Boolean(count))`.
- [ ] **Step 5: Inputs and selects:** the local `INPUT` constant becomes `"calm-input"`. The summary box becomes `rounded-2xl bg-mist p-6`.
- [ ] **Step 6: Sent:** rebuild on `Confirmation`:

```tsx
<Confirmation title="Request sent" note={emailed ? `A copy is in ${email}.` : "Saved under My reservations."} focusRef={doneRef}>
  <div className="space-y-3">
    <p className="text-[1.3rem] font-semibold text-ink">{rows.event}</p>
    <IconLine icon="calendar">{rows.when}</IconLine>
    <IconLine icon="pin">{rows.rooms}</IconLine>
    <IconLine icon="people">{rows.people} people</IconLine>
    <p className="text-[0.92rem] text-ink-mute">Reference <span className="font-semibold tabular-nums text-ink">{reference}</span></p>
  </div>
  <ol className="space-y-4">{/* the three "What happens next" steps, each: a 28px circle (teal ✓ for the first, a grey number otherwise) and two lines */}</ol>
  {event ? <AddToCalendar bare event={event} /> : null}
  <p className="flex flex-wrap gap-x-6 gap-y-2 text-[0.98rem]">
    <Link href="/my/reservations" className="font-semibold text-clay hover:underline">See my requests</Link>
    <button type="button" onClick={onAnother} className="font-semibold text-clay hover:underline">Request another room</button>
  </p>
</Confirmation>
```

Change `Sent`'s `rows` prop from `[string, string][]` to `{ event: string; when: string; rooms: string; people: number }`, and update the caller. Add a `doneRef` with focus-on-success, as in the Dgroup form.
- [ ] **Step 7: Page:** the signed-out gate card becomes `calm-card p-8 sm:p-10`. The signed-in section gets `bg-mist`.
- [ ] **Step 8:** Typecheck, then a visual check via `src/app/zzpreview/room/page.tsx`. Commit `feat: calm room request flow and confirmation`.

### Task 9: DESIGN.md, full checks, PR

- [ ] **Step 1:** Add a "Calm booking look" section to `DESIGN.md` covering:
  - `--mist`, `--rule`;
  - `.calm-card`, `.calm-input`;
  - `choiceClass`, `DayCircle`, `StatusBadge`, `IconLine`, `Confirmation`, `calmChipClass`;
  - the badge tones (teal, maroon, grey);
  - the rule "reservation pages now; the rest of the site to follow".

  Update the "Booking flows" bullets: questions are no longer numbered circles, and days are date circles.
- [ ] **Step 2:** Run `npm run typecheck && npm run test:content && npm run build`. All pass.
- [ ] **Step 3:** `rm -rf src/app/zzpreview .next/dev/types`, commit, push, and run `gh pr create`. Wait for the checks, then merge with `gh pr merge --merge --delete-branch`. Confirm the production deploy and a 200 on `/reserve`, `/reserve/dgroup` and `/centris/reserve`.

---

# PR 2: My reservations and Book again (branch `feat/my-reservations-calm`)

### Task 10: The Book again date

**Files:** Modify `src/lib/dgroup-tables.ts`, `src/lib/dgroup-tables.test.ts`

- [ ] **Step 1: Write the failing test** (append):

```ts
test("book again lands on the next open date with the same weekday and slot", () => {
  // Booked Wed Oct 7, 4 PM. On Sunday Oct 11 next week opens: Wed Oct 14.
  assert.equal(rebookDate("2026-10-07", "1600", "2026-10-11", 600), "2026-10-14");
  // Mid-week (Thu Oct 8) the following Wednesday isn't open yet.
  assert.equal(rebookDate("2026-10-07", "1600", "2026-10-08", 600), null);
  // A past booking on a Monday, looked at on Sunday: this coming Monday.
  assert.equal(rebookDate("2026-10-05", "1300", "2026-10-11", 600), "2026-10-12");
  // Same day, slot already started: nothing.
  assert.equal(rebookDate("2026-10-05", "1300", "2026-10-12", 14 * 60), null);
});
```

Add `rebookDate` to the import list.
- [ ] **Step 2:** `npx tsx --test src/lib/dgroup-tables.test.ts`. Expected: FAIL (`rebookDate` is not exported).
- [ ] **Step 3: Implement** (after `nightOptions`):

```ts
/**
 * Where "Book again" lands: the first bookable date after `bookedOn` on the
 * same weekday whose `slotId` hasn't started. Null when that week isn't open
 * yet (next week opens on Sunday).
 */
export function rebookDate(bookedOn: string, slotId: string, today: string, nowMinutes: number): string | null {
  const weekday = toDate(bookedOn).getUTCDay();
  return (
    bookableNights(today).find(
      (d) => d > bookedOn && toDate(d).getUTCDay() === weekday && openSlots(d, today, nowMinutes).some((s) => s.id === slotId),
    ) ?? null
  );
}
```

- [ ] **Step 4:** Rerun. Expected: PASS.
- [ ] **Step 5: Commit** `feat: the Book again date rule`

### Task 11: A shared booking path and `rebookDgroupTable`

**Files:** Modify `src/app/actions/dgroup-tables.ts`

- [ ] **Step 1: Extract** the candidate loop of `reserveDgroupTable` (from `let taken` through the final "filled up" return) into:

```ts
/** Assign and hold tables for one booking, then email the leader. Shared by booking and Book again. */
async function bookTables(
  userId: string,
  b: { date: string; slotId: string; groupSize: number; leaderName: string; contactMobile: string; leaderEmail: string },
): Promise<DgroupBookingResult> {
  /* the existing body, unchanged, with `user.id` → `userId` */
}
```

`reserveDgroupTable` then ends with `return bookTables(user.id, parsed.value);`.
- [ ] **Step 2: Add the action:**

```ts
/**
 * Book the same weekday, time and headcount again, at the next open date
 * (rebookDate). Uses the booking's own leader details; the policies were
 * accepted for this group already.
 */
export async function rebookDgroupTable(id: string): Promise<DgroupBookingResult> {
  if (!hasSupabase()) return { ok: false, formError: GENERIC };
  const user = await currentUser();
  if (!user) return { ok: false, needsAuth: true, formError: "Sign in again to book." };
  const { data: row } = await supabaseAdmin()
    .from("dgroup_table_bookings")
    .select("booked_on, slot_id, group_size, leader_name, leader_email, contact_mobile")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!row) return { ok: false, formError: "That booking can't be found." };
  const today = manilaDateKey();
  const date = rebookDate(row.booked_on as string, row.slot_id as string, today, manilaMinutes());
  if (!date) return { ok: false, formError: "That week isn't open yet. Next week opens on Sunday." };
  return bookTables(user.id, {
    date,
    slotId: row.slot_id as string,
    groupSize: row.group_size as number,
    leaderName: row.leader_name as string,
    contactMobile: (row.contact_mobile as string | null) ?? "",
    leaderEmail: (row.leader_email as string | null) ?? user.email,
  });
}
```

First confirm the column names: `grep -n "contact_mobile\|leader_email\|leader_name" supabase/migrations/0006_dgroup_table_bookings.sql`, and adjust if they differ.
- [ ] **Step 3:** Typecheck and test. Commit `feat: Book again for Dgroup tables`.

### Task 12: The Book again button

**Files:** Create `src/app/my/reservations/book-again.tsx`

- [ ] **Step 1:**

```tsx
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { rebookDgroupTable, type DgroupBookingResult } from "@/app/actions/dgroup-tables";

/** "Book again" for a Dgroup table, or "Opens Sunday" when that week isn't open. */
export function BookAgain({ id, target, label }: { id: string; target: string | null; label?: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<DgroupBookingResult | null>(null);
  if (!target) return <span className="text-[0.92rem] text-ink-mute">Book again opens Sunday</span>;
  if (result?.ok && result.booking)
    return <span role="status" className="text-[0.95rem] font-semibold text-moss">Booked: {result.booking.tables}, {result.booking.night}</span>;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={pending} onClick={() => start(async () => setResult(await rebookDgroupTable(id)))}
        className="btn-press inline-flex min-h-11 items-center rounded-full border border-clay px-5 text-[0.95rem] font-semibold text-clay hover:bg-clay hover:text-paper-bright disabled:opacity-50">
        {pending ? "Booking…" : (label ?? "Book again")}
      </button>
      {result && !result.ok ? (
        <span role="alert" className="text-[0.85rem] font-semibold text-clay-deep">
          {result.formError ?? result.fieldErrors?.slotId ?? "Couldn't book that."}
          {result.needsAuth ? <> <Link href="/sign-in?next=/my/reservations" className="underline">Sign in</Link></> : null}
        </span>
      ) : null}
    </span>
  );
}
```

`target` is worked out on the server with `rebookDate`, so the button knows whether it can book. The label reads e.g. "Book Wed, Oct 14".
- [ ] **Step 2:** Also add it to the Dgroup confirmation (Task 7). `DgroupBookingResult.booking` needs an `id`, and `book_dgroup_tables` returns it. Check with `grep -n "returns" supabase/migrations/0008_dgroup_booking_launch.sql`. If the RPC returns the booking id, add `id` to `booking` and render `<BookAgain id={b.id} target={…} label="Book the same time next week" />`, with `target` computed client-side by `rebookDate(b.date, b.slotId, today, manilaMinutes())` (`dgroup-tables` is browser-safe). If it doesn't return the id, skip the confirmation link and note it in the PR.
- [ ] **Step 3:** Typecheck. Commit `feat: Book again button`.

### Task 13: Rebuild My reservations

**Files:** Modify `src/app/my/reservations/page.tsx`. Create `src/app/my/reservations/next-up.tsx` and `booking-actions.tsx`.

- [ ] **Step 1: The data.** In `page.tsx`:

```ts
const today = manilaDateKey();
const now = manilaMinutes();
const [tables, rooms] = await Promise.all([getMyDgroupBookings(today), getMyBookings()]);
const upcoming = mergeUpcoming(tables, rooms);
const [next, ...later] = upcoming;
const past = rooms.filter((r) => !upcoming.some((u) => u.id === r.id));
const nights = nightOptions(today, now);
const rebook = (u: Upcoming) => (u.table ? rebookDate(u.table.booked_on, u.table.slot_id, today, now) : null);
```

Past Dgroup tables aren't fetched today (`getMyDgroupBookings` filters from `today`). Past shows rooms only; mention that in the PR.
- [ ] **Step 2: `booking-actions.tsx` (client).** It holds the actions for one booking.
  - For a table: "Add to calendar" (`AddToCalendar bare` with `dgroupEvent`), "Change" (toggles today's `ChangeForm`, exported from `my-booking.tsx` for this), "Cancel" (today's confirm form with `cancelDgroupBooking`) and `BookAgain`.
  - For a room: "Add to calendar" (`roomEvent`, with `confirmed` = status approved), and `CancelButton` when `pending` or `approved`.
  - Props: `{ item: Upcoming; nights: NightOption[]; rebookTarget: string | null; reference?: string }`.
- [ ] **Step 3: `next-up.tsx` (server).** A `calm-card p-7 sm:p-9` containing:
  - a row with `whenLabel(next.date, today)` (eyebrow, teal, uppercase) and `StatusBadge` (from `statusBadge(next.status)`);
  - the title (`text-[1.5rem] font-semibold`);
  - `IconLine`s for calendar (`nightLabel(next.date)` for tables, or the formatted date for rooms), clock (`next.time`) and people;
  - the floor plan for tables, in `rounded-2xl bg-mist p-4`;
  - `BookingActions`.
- [ ] **Step 4: Later.** A `calm-card divide-y divide-rule` of rows. Each row is a `<details>` whose `<summary>` has:
  - a date column (`w-24`: weekday, and day + month);
  - the title and time;
  - a `StatusBadge`;
  - "Manage" (`text-clay font-semibold`).

  The body renders `BookingActions`. The summary is at least 64px tall and hides the marker.
- [ ] **Step 5: Past.** A `<details className="calm-card">` with a summary reading "Past bookings (N)", holding rows (date, title, badge). No actions.
- [ ] **Step 6: Empty.** A `calm-card p-9 text-center` with "Nothing booked yet.", then two `ButtonLink`s: "Book a Dgroup table" → `/reserve/dgroup`, and "Request a room" (outline) → `/centris/reserve`. This fixes today's wrong "Book a court or room" link.
- [ ] **Step 7:** The page header lead becomes "Your bookings at CCF Centris, soonest first." The content section gets `bg-mist` and `Container className="max-w-3xl"`.
- [ ] **Step 8:** Remove `BookingCard`, `StatusPill`, `TONE` and `STATUS_LABEL` from the page. `MyBooking` in `reserve/dgroup/my-booking.tsx` stays only if still used. Grep for it, and delete it if unused, moving `ChangeForm` into `booking-actions.tsx`.
- [ ] **Step 9:** Typecheck, lint, test. Visual check via `zzpreview/my` (render `NextUp` and rows with sample `Upcoming` data). Commit `feat: calm My reservations, next up first`.

### Task 14: PR 2

- [ ] Run the full checks, then push, open the PR, merge, and verify production, as in Task 9 Step 3. Check `/my/reservations` for a 307 or 200: it redirects when you're signed out, which is expected.

---

# PR 3: Reminder the day before (branch `feat/booking-reminders`)

### Task 15: Migration

**Files:** Create `supabase/migrations/0013_booking_reminders.sql`

- [ ] **Step 1:**

```sql
-- Day-before reminder emails (2026-09-30). Stamped once the email goes out, so
-- the daily job never sends the same reminder twice.
alter table dgroup_table_bookings add column if not exists reminder_sent_at timestamptz;
alter table reservations add column if not exists reminder_sent_at timestamptz;
```

- [ ] **Step 2:** `npm run test:content`. The RLS test runs every migration in PGlite; expect all pass.
- [ ] **Step 3:** Commit `db: reminder_sent_at on bookings`.

### Task 16: Which reminders are due

**Files:** Create `src/lib/reminders.ts`, `src/lib/reminders.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { manilaTomorrow, manilaDayRange } from "./reminders";

test("tomorrow is counted in Manila, not UTC", () => {
  // 2026-10-06 17:00 UTC is already Oct 7, 1 AM in Manila.
  assert.equal(manilaTomorrow(new Date("2026-10-06T17:00:00Z")), "2026-10-08");
  assert.equal(manilaTomorrow(new Date("2026-10-06T02:00:00Z")), "2026-10-07");
});

test("a Manila day as a UTC range for the reservations query", () => {
  assert.deepEqual(manilaDayRange("2026-10-07"), {
    from: "2026-10-06T16:00:00.000Z",
    to: "2026-10-07T16:00:00.000Z",
  });
});
```

- [ ] **Step 2:** `npx tsx --test src/lib/reminders.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
/** Dates for the day-before reminder job (2026-09-30). Manila has no daylight saving. */
const H8 = 8 * 3_600_000;

export function manilaTomorrow(now: Date = new Date()): string {
  return new Date(now.getTime() + H8 + 86_400_000).toISOString().slice(0, 10);
}

export function manilaDayRange(date: string): { from: string; to: string } {
  const start = new Date(`${date}T00:00:00+08:00`).getTime();
  return { from: new Date(start).toISOString(), to: new Date(start + 86_400_000).toISOString() };
}
```

- [ ] **Step 4:** Rerun. Expected: PASS. Commit `feat: dates for day-before reminders`.

### Task 17: The reminder email kind

**Files:** Modify `src/lib/emails/dgroup-booking.ts`, `src/lib/emails/room-request.ts`, `src/lib/calendar.test.ts` (or a new `src/lib/emails/reminder.test.ts`)

- [ ] **Step 1: Write the failing test** `src/lib/emails/reminder.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { bookingEmail } from "./dgroup-booking";
import { roomRequestEmail } from "./room-request";

test("the Dgroup reminder says tomorrow and carries the invite", () => {
  const m = bookingEmail({ kind: "reminder", origin: "https://x", leaderName: "Ana Cruz", roomSlug: "welcome-center", labels: ["4"], date: "2026-10-07", slotId: "1600", groupSize: 6 });
  assert.match(m.subject, /^Tomorrow: /);
  assert.match(m.html, /See you tomorrow, Ana/);
  assert.equal(m.attachments?.[0].filename, "dgroup-table.ics");
});

test("the room reminder says tomorrow and carries the invite", () => {
  const m = roomRequestEmail({ kind: "reminder", origin: "https://x", reference: "R-1", requester: "Ana Cruz", requesterEmail: "a@x", mobile: null, activity: "Huddle", ministry: "Elevate", rooms: ["John (MPH 1)"], when: "Tue", participants: 60, setup: "classroom", equipment: null, food: "none", notes: null, span: { startsAt: "2026-10-06T05:00:00.000Z", endsAt: "2026-10-06T09:00:00.000Z" } });
  assert.match(m.subject, /^Tomorrow: /);
  assert.equal(m.attachments?.[0].filename, "room-booking.ics");
});
```

- [ ] **Step 2:** Run it. Expected: FAIL (a type error, or no match).
- [ ] **Step 3: Dgroup email:** add `"reminder"` to `BookingEmailKind`. Add these entries to the `subject`, `headline` and `intro` maps:
  - `reminder: \`Tomorrow: ${tables}, ${room} · ${slotLabel(d.slotId)}\``
  - `reminder: \`See you tomorrow, ${first}.\``
  - `reminder: "A reminder of your Dgroup table. If plans changed, please cancel so another Dgroup can use it."`

  The eyebrow text for this kind is "Dgroup table reminder". Everything else is as for `confirmed`: it isn't `cancelled`, so the floor plan, calendar and attachment are included.
- [ ] **Step 4: Room email:** add `"reminder"` to `RoomEmailKind`, with these entries:
  - subject `Tomorrow: ${d.activity} in ${rooms}`
  - eyebrow "Room reminder"
  - headline `See you tomorrow, ${first}.`
  - intro "A reminder that your room is booked. If plans changed, please cancel from My reservations so another ministry can use it."
  - button: as for approved.

  The calendar `event` is built for `approved` **or** `reminder` when `d.span` is set.
- [ ] **Step 5:** Rerun the tests. Expected: PASS. Typecheck. Commit `feat: reminder email kind`.

### Task 18: The cron route

**Files:** Create `src/app/api/cron/reminders/route.ts`. Modify `vercel.json` and `.env.example`.

- [ ] **Step 1: The route:**

```ts
import { NextResponse } from "next/server";
import { hasSupabase, SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, siteOrigin } from "@/lib/email";
import { bookingEmail } from "@/lib/emails/dgroup-booking";
import { roomRequestEmail } from "@/lib/emails/room-request";
import { manilaDayRange, manilaTomorrow } from "@/lib/reminders";
import { referenceFor } from "@/lib/reference";
import { fmtDayLong, fmtTime } from "@/lib/format";

/**
 * Day-before reminders (2026-09-30). Vercel Cron calls this once a day
 * (vercel.json) with `Authorization: Bearer $CRON_SECRET`. It emails every
 * confirmed Dgroup table and approved room booked for tomorrow in Manila, and
 * stamps reminder_sent_at after each successful send, so a rerun never sends
 * a reminder twice.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  if (!hasSupabase()) return NextResponse.json({ tables: 0, rooms: 0 });

  const db = supabaseAdmin();
  const date = manilaTomorrow();
  const origin = siteOrigin();
  let tables = 0;
  let rooms = 0;

  const { data: due } = await db
    .from("dgroup_table_bookings")
    .select("id, leader_name, leader_email, room_slug, table_labels, booked_on, slot_id, group_size")
    .eq("satellite_id", SATELLITE_ID)
    .eq("booked_on", date)
    .eq("status", "confirmed")
    .is("reminder_sent_at", null);
  for (const b of due ?? []) {
    if (!b.leader_email) continue;
    const mail = bookingEmail({ kind: "reminder", origin, leaderName: b.leader_name as string, roomSlug: b.room_slug as string, labels: b.table_labels as string[], date: b.booked_on as string, slotId: b.slot_id as string, groupSize: b.group_size as number });
    if ((await sendEmail({ to: b.leader_email as string, ...mail })).ok) {
      await db.from("dgroup_table_bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
      tables++;
    }
  }

  const { from, to } = manilaDayRange(date);
  const { data: held } = await db
    .from("reservations")
    .select("id, request_group, contact_name, contact_email, contact_mobile, organization, activity_name, participants, during, layout, equipment, food, purpose, facilities(name)")
    .eq("satellite_id", SATELLITE_ID)
    .eq("status", "approved")
    .is("court_id", null)
    .is("reminder_sent_at", null)
    .overlaps("during", `[${from},${to})`);
  // One email per request group, listing all its rooms.
  const groups = new Map<string, NonNullable<typeof held>>();
  for (const r of held ?? []) {
    const key = (r.request_group as string | null) ?? (r.id as string);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const [key, rows] of groups) {
    const first = rows[0];
    const m = /[[(]"?([^",]+)"?,\s*"?([^")]+)"?[)\]]/.exec(first.during as string);
    if (!m || !first.contact_email) continue;
    const startsAt = new Date(m[1]).toISOString();
    const endsAt = new Date(m[2]).toISOString();
    if (startsAt < from || startsAt >= to) continue; // started the day before
    const name = (f: unknown) => (Array.isArray(f) ? f[0]?.name : (f as { name?: string } | null)?.name) ?? "Room";
    const mail = roomRequestEmail({
      kind: "reminder", origin, reference: referenceFor("reservation", key),
      requester: first.contact_name as string, requesterEmail: first.contact_email as string,
      mobile: (first.contact_mobile as string | null) ?? null, activity: (first.activity_name as string | null) ?? "Your event",
      ministry: (first.organization as string | null) ?? "", rooms: rows.map((r) => name(r.facilities)),
      when: `${fmtDayLong(startsAt)}, ${fmtTime(startsAt)} to ${fmtTime(endsAt)}`, participants: first.participants as number,
      setup: (first.layout as string | null) ?? null, equipment: (first.equipment as Record<string, number> | null) ?? null,
      food: (first.food as string | null) ?? null, notes: (first.purpose as string | null) ?? null, span: { startsAt, endsAt },
    });
    if ((await sendEmail({ to: first.contact_email as string, ...mail })).ok) {
      await db.from("reservations").update({ reminder_sent_at: new Date().toISOString() }).in("id", rows.map((r) => r.id as string));
      rooms++;
    }
  }

  return NextResponse.json({ date, tables, rooms });
}
```

- [ ] **Step 2: `vercel.json`:**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["syd1"],
  "crons": [{ "path": "/api/cron/reminders", "schedule": "0 2 * * *" }]
}
```

- [ ] **Step 3: `.env.example`** (near `RESEND_API_KEY`):

```
# Day-before reminders (/api/cron/reminders, run daily by Vercel Cron at 10 AM
# Manila). Any long random string; Vercel sends it with each cron call. Unset:
# the route refuses every call, so no reminders go out.
CRON_SECRET=
```

- [ ] **Step 4:** Typecheck and build. The build lists `ƒ /api/cron/reminders`.
- [ ] **Step 5: Local check:** start dev with `CRON_SECRET=test` in the environment, then run `curl -s -H "Authorization: Bearer test" localhost:3000/api/cron/reminders`. Expect `{"tables":0,"rooms":0}` (there's no Supabase locally). Without the header, expect 401.
- [ ] **Step 6:** Commit `feat: daily reminder job`.

### Task 19: Apply the migration and ship PR 3

- [ ] **Step 1:** `npx supabase db push --linked` (applies 0013), then `npx supabase migration list --linked`. 0013 shows as applied remotely.
- [ ] **Step 2:** Run the full checks, then push, open the PR, merge, and verify production. After merge, `curl -s -o /dev/null -w "%{http_code}" https://ccf-centris.vercel.app/api/cron/reminders` returns 401.
- [ ] **Step 3:** Tell Ralph to add `CRON_SECRET` in Vercel (Production). Until then the job refuses every call and no reminders go out.
