import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminNote } from "../admin-ui";
import { cx } from "@/components/ui";
import { requireAdmin } from "@/lib/admin-auth";
import { hasSupabase } from "@/lib/supabase/server";
import { getDgroupTableBookings, getEvents, getReservations, getRoomBlocks } from "@/lib/queries";
import { manilaDateKey } from "@/lib/format";
import { manilaDay, manilaMinutesOf } from "@/lib/admin-day";
import { daysCovered, venueRooms } from "@/lib/announcements";
import { MINISTRY_ROOMS, setupLabel, tablesSummary, timeLabel } from "@/lib/ministry-rooms";

export const metadata: Metadata = { title: "Rooms" };
export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface Item {
  key: string;
  from: number | null;
  to: number | null;
  title: string;
  detail?: string;
  tone: "approved" | "pending" | "blocked" | "event" | "tables";
}

/**
 * One room's month (Ralph, 2026-10-10): every request, block, event and,
 * for the Dgroup rooms, the table bookings, so the team can see a room's
 * schedule at a glance. The Week board shows every room for one week; a
 * day opens on the Today board, where requests are approved.
 */
export default async function AdminRooms({ searchParams }: PageProps<"/admin/rooms">) {
  await requireAdmin();
  const sp = await searchParams;
  const room = MINISTRY_ROOMS.find((r) => r.slug === sp.room) ?? MINISTRY_ROOMS[0];
  const today = manilaDateKey();
  const month = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const from = new Date(`${first}T00:00:00+08:00`);
  const to = new Date(from.getTime() + daysInMonth * 86_400_000);
  const shiftMonth = (n: number) => {
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  const [rooms, blocks, tables, events] = await Promise.all([
    getReservations(),
    getRoomBlocks(from.toISOString(), to.toISOString()),
    room.dgroupRoom ? getDgroupTableBookings() : Promise.resolve([]),
    getEvents({ includeCalendarOnly: true }),
  ]);

  const byDay = new Map<string, Item[]>();
  const add = (day: string, it: Item) => {
    if (day.slice(0, 7) !== month) return;
    byDay.set(day, [...(byDay.get(day) ?? []), it]);
  };

  for (const r of rooms) {
    if (r.facility_name !== room.name || !["pending", "approved"].includes(r.status)) continue;
    add(manilaDay(r.starts_at), {
      key: r.id,
      from: manilaMinutesOf(r.starts_at),
      to: manilaMinutesOf(r.ends_at),
      title: r.activity_name ?? "Room request",
      detail: [
        r.organization,
        `${r.participants} people`,
        r.layout ? setupLabel(r.layout) : null,
        r.layout === "tables" ? tablesSummary(r.tables) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      tone: r.status === "approved" ? "approved" : "pending",
    });
  }
  for (const b of blocks) {
    if (b.facility_name !== room.name) continue;
    add(manilaDay(b.starts_at), {
      key: b.id,
      from: manilaMinutesOf(b.starts_at),
      to: manilaMinutesOf(b.ends_at),
      title: `Blocked${b.reason ? ` · ${b.reason}` : ""}`,
      tone: "blocked",
    });
  }
  for (const e of events) {
    if (!venueRooms(e.location_note).includes(room.name)) continue;
    for (const d of e.dates ?? [{ starts_at: e.starts_at, ends_at: e.ends_at, all_day: false }]) {
      for (const day of daysCovered(d)) {
        add(day, {
          key: `${e.id}-${day}`,
          from: d.all_day ? null : manilaMinutesOf(d.starts_at),
          to: d.all_day || !d.ends_at ? null : manilaMinutesOf(d.ends_at),
          title: e.title,
          detail: "Event",
          tone: "event",
        });
      }
    }
  }
  // The Dgroup rooms: one line a night for the table bookings.
  const tableCount = new Map<string, number>();
  for (const t of tables) {
    if (t.room_slug !== room.slug || !["pending", "confirmed"].includes(t.status)) continue;
    tableCount.set(t.booked_on, (tableCount.get(t.booked_on) ?? 0) + 1);
  }
  for (const [day, n] of tableCount) {
    add(day, { key: `tables-${day}`, from: 13 * 60, to: 21 * 60 + 30, title: `Dgroup tables · ${n} ${n === 1 ? "booking" : "bookings"}`, tone: "tables" });
  }
  for (const list of byDay.values()) list.sort((a, b) => (a.from ?? -1) - (b.from ?? -1));

  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  const href = (q: { room?: string; m?: string }) => `/admin/rooms?room=${q.room ?? room.slug}&m=${q.m ?? month}`;
  const nav =
    "btn-press inline-flex min-h-10 items-center rounded-lg border border-edge bg-paper-bright px-3.5 text-[0.92rem] font-semibold text-ink hover:border-clay hover:text-clay";
  const toneClass: Record<Item["tone"], string> = {
    approved: "bg-clay text-paper-bright",
    pending: "border border-dashed border-sky/60 bg-sky-wash text-sky",
    blocked: "bg-ink/10 text-ink-soft",
    event: "bg-moss/15 text-moss",
    tables: "bg-mist text-ink-soft",
  };
  const when = (it: Item) => (it.from === null ? "All day" : `${timeLabel(it.from)}${it.to !== null ? ` – ${timeLabel(it.to)}` : ""}`);
  const daysWithItems = cells.filter((d): d is string => Boolean(d && byDay.get(d)?.length));

  return (
    <div className="space-y-6">
      <AdminHeader title="Rooms" lead="One room's month: requests, blocks, events and Dgroup tables. Open a day to approve requests." />
      {!hasSupabase() ? <AdminNote>Not connected to a database.</AdminNote> : null}

      <nav aria-label="Room" className="flex flex-wrap gap-2">
        {MINISTRY_ROOMS.map((r) => (
          <Link
            key={r.slug}
            href={href({ room: r.slug })}
            aria-current={r.slug === room.slug ? "page" : undefined}
            className={cx(
              "inline-flex min-h-10 items-center rounded-lg border px-3.5 text-[0.92rem] font-semibold",
              r.slug === room.slug ? "border-clay bg-clay text-paper-bright" : "border-edge bg-paper-bright text-ink hover:border-clay",
            )}
          >
            {r.name}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={href({ m: shiftMonth(-1) })} className={nav} aria-label="Previous month">
          ←
        </Link>
        <h2 className="mx-2 font-display text-2xl font-bold">
          {MONTHS[m - 1]} {y}
        </h2>
        <Link href={href({ m: shiftMonth(1) })} className={nav} aria-label="Next month">
          →
        </Link>
        {month !== today.slice(0, 7) ? (
          <Link href={href({ m: today.slice(0, 7) })} className={nav}>
            This month
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 text-[0.82rem] text-ink-mute">
        {(
          [
            ["approved", "Approved"],
            ["pending", "Awaiting approval"],
            ["event", "Event"],
            ["blocked", "Blocked"],
            ...(room.dgroupRoom ? [["tables", "Dgroup tables"]] : []),
          ] as [Item["tone"], string][]
        ).map(([t, label]) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cx("h-3 w-3 rounded-sm", toneClass[t])} />
            {label}
          </span>
        ))}
      </div>

      {/* Laptops: the month as a grid. */}
      <div className="hidden overflow-hidden rounded-xl border border-hairline bg-paper-bright md:block">
        <div className="grid grid-cols-7 border-b border-hairline">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-2 py-2 text-[0.8rem] font-semibold text-ink-mute">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-hairline">
          {cells.map((d, i) =>
            d ? (
              <div key={d} className={cx("min-h-28 bg-paper-bright p-1.5", d === today && "ring-1 ring-inset ring-clay", d < today && "opacity-60")}>
                <Link href={`/admin/today?d=${d}`} className={cx("text-[0.85rem] font-semibold hover:text-clay", d === today ? "text-clay" : "text-ink-mute")}>
                  {Number(d.slice(8))}
                </Link>
                <ul className="mt-1 space-y-1">
                  {(byDay.get(d) ?? []).map((it) => (
                    <li key={it.key} title={[it.title, when(it), it.detail].filter(Boolean).join(" · ")} className={cx("rounded px-1.5 py-1 text-[0.72rem] leading-tight", toneClass[it.tone])}>
                      <span className="block truncate font-semibold">{it.title}</span>
                      <span className="block truncate opacity-90">{when(it)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div key={`pad-${i}`} className="bg-paper-bright/50" />
            ),
          )}
        </div>
      </div>

      {/* Phones: the days that have something, as a list. */}
      <ul className="divide-y divide-hairline rounded-xl border border-hairline bg-paper-bright md:hidden">
        {daysWithItems.length ? (
          daysWithItems.map((d) => (
            <li key={d} className="p-4">
              <Link href={`/admin/today?d=${d}`} className="font-semibold text-ink hover:text-clay">
                {WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()]} {Number(d.slice(8))} {MONTHS[m - 1].slice(0, 3)}
              </Link>
              <ul className="mt-2 space-y-1.5">
                {(byDay.get(d) ?? []).map((it) => (
                  <li key={it.key} className={cx("rounded-lg px-3 py-2 text-[0.9rem]", toneClass[it.tone])}>
                    <span className="block font-semibold">{it.title}</span>
                    <span className="block opacity-90">{[when(it), it.detail].filter(Boolean).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))
        ) : (
          <li className="p-4 text-ink-mute">Nothing booked in {room.name} this month.</li>
        )}
      </ul>
    </div>
  );
}
