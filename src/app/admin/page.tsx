import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminNote, AdminPanel } from "./admin-ui";
import { EventTags, eventTime } from "./today/board";
import { cx } from "@/components/ui";
import { getAdminCounts, getAdminEvents, getDgroupTableBookings, getReservations } from "@/lib/queries";
import { hasSupabase } from "@/lib/supabase/server";
import { fmtDayLong, manilaDateKey } from "@/lib/format";
import { eventsOn, manilaDay, manilaMinutesOf, roomLabel, shiftDay } from "@/lib/admin-day";
import { DGROUP_SLOTS } from "@/lib/dgroup-tables";
import { timeLabel } from "@/lib/ministry-rooms";

export const metadata: Metadata = { title: { absolute: "Home — CCF Centris Admin" } };
export const dynamic = "force-dynamic";

/**
 * The admin home (rewritten 2026-10-14). Ralph asked for a console anyone on
 * staff can use without training: first what's waiting for them, then what's
 * on at the center today, then the next two weeks. The template's version
 * counted sample volunteer roles and listed events that had already passed.
 */
export default async function AdminHome() {
  const today = manilaDateKey();
  const [counts, events, rooms, tables] = await Promise.all([
    getAdminCounts(),
    getAdminEvents(),
    getReservations(),
    getDgroupTableBookings(),
  ]);

  const waiting = [
    { n: counts.rooms, href: "/admin/reservations", one: "room request to approve", many: "room requests to approve" },
    { n: counts.dgroups, href: "/admin/dgroups", one: "new Dgroup to approve", many: "new Dgroups to approve" },
    { n: counts.announcements, href: "/admin/announcements", one: "announcement to review", many: "announcements to review" },
    { n: counts.prayer, href: "/admin/prayer", one: "Prayer Wall report to check", many: "Prayer Wall reports to check" },
  ];
  const allClear = waiting.every((w) => w.n === 0);

  // Today: events, approved room bookings and Dgroup tables.
  const todayEvents = eventsOn(events, today);
  const todayRooms = rooms
    .filter((r) => r.status === "approved" && manilaDay(r.starts_at) === today)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const todayTables = tables.filter((t) => t.booked_on === today && ["pending", "confirmed"].includes(t.status));

  // The next 14 days of events, each on its next date.
  const days = Array.from({ length: 14 }, (_, i) => shiftDay(today, i + 1));
  const soon = days.flatMap((d) => eventsOn(events, d).map((e) => ({ ...e, day: d })));
  const seen = new Set<string>();
  const comingUp = soon.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))).slice(0, 8);

  return (
    <div className="space-y-8">
      <AdminHeader title="Home" lead={`${fmtDayLong(new Date())}. What's waiting for you, and what's on at CCF Centris.`} />
      {!hasSupabase() ? <AdminNote>Not connected to a database.</AdminNote> : null}

      <section aria-labelledby="h-waiting" className="space-y-3">
        <h2 id="h-waiting" className="font-display text-xl font-bold">
          Waiting for you
        </h2>
        {allClear ? (
          <p className="rounded-xl border border-moss/30 bg-moss/10 px-5 py-4 text-[1rem] font-semibold text-moss">
            All done. Nothing is waiting for you right now.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {waiting
              .filter((w) => w.n > 0)
              .map((w) => (
                <li key={w.href}>
                  <Link
                    href={w.href}
                    className="btn-press flex items-center gap-4 rounded-xl border border-clay/40 bg-paper-bright px-5 py-4 transition-colors hover:border-clay hover:bg-clay/5"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-clay text-[1.15rem] font-bold text-paper-bright">
                      {w.n}
                    </span>
                    <span className="flex-1 text-[1rem] font-semibold text-ink">{w.n === 1 ? w.one : w.many}</span>
                    <span aria-hidden className="text-clay">
                      →
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminPanel
          title="Today at Centris"
          action={
            <Link href="/admin/today" className="text-[0.9rem] font-semibold text-clay underline underline-offset-4">
              Open today&rsquo;s board
            </Link>
          }
        >
          <div className="divide-y divide-rule">
            <TodayBlock title="Events" empty="No events today.">
              {todayEvents.map((e) => (
                <li key={e.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="w-32 shrink-0 text-ink-mute">{eventTime(e)}</span>
                  <Link href={`/admin/events/${e.id}`} className="font-semibold text-ink hover:text-clay">
                    {e.title}
                  </Link>
                  <EventTags e={e} />
                </li>
              ))}
            </TodayBlock>
            <TodayBlock title="Rooms booked" empty="No rooms booked today.">
              {todayRooms.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="w-32 shrink-0 text-ink-mute">
                    {timeLabel(manilaMinutesOf(r.starts_at))} – {timeLabel(manilaMinutesOf(r.ends_at))}
                  </span>
                  <span className="font-semibold text-ink">{r.activity_name ?? "Booking"}</span>
                  <span className="text-ink-mute">
                    {roomLabel(r)}
                    {r.organization ? ` · ${r.organization}` : ""}
                  </span>
                </li>
              ))}
            </TodayBlock>
            <TodayBlock title="Dgroup tables" empty="No Dgroup tables booked today.">
              {DGROUP_SLOTS.map((s) => {
                const n = todayTables.filter((t) => t.slot_id === s.id).length;
                return n ? (
                  <li key={s.id} className="flex gap-2">
                    <span className="w-32 shrink-0 text-ink-mute">{s.label}</span>
                    <span className="font-semibold text-ink">
                      {n} {n === 1 ? "group" : "groups"}
                    </span>
                  </li>
                ) : null;
              })}
            </TodayBlock>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Events in the next two weeks"
          action={
            <Link href="/admin/events" className="text-[0.9rem] font-semibold text-clay underline underline-offset-4">
              All events
            </Link>
          }
        >
          {comingUp.length ? (
            <ul className="divide-y divide-rule">
              {comingUp.map((e) => (
                <li key={e.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3 text-[0.95rem]">
                  <span className="w-36 shrink-0 text-ink-mute">
                    {fmtDayLong(`${e.day}T12:00:00+08:00`).replace(/,? \d{4}$/, "")}
                  </span>
                  <Link href={`/admin/events/${e.id}`} className="font-semibold text-ink hover:text-clay">
                    {e.title}
                  </Link>
                  <EventTags e={e} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-[0.95rem] text-ink-mute">No events in the next two weeks.</p>
          )}
        </AdminPanel>
      </div>

      <section aria-labelledby="h-do" className="space-y-3">
        <h2 id="h-do" className="font-display text-xl font-bold">
          Things you can do
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/events/new", title: "Add an event", note: "Put it on What's Happening or the calendar." },
            { href: "/admin/blocks", title: "Close a room or table", note: "For repairs, cleaning or a staff use." },
            { href: "/admin/bookings", title: "Find a booking", note: "Search by name, mobile or ministry." },
            { href: "/admin/watch", title: "Change the Sunday video", note: "Pin a different replay on the site." },
          ].map((a) => (
            <li key={a.href}>
              <Link
                href={a.href}
                className={cx("btn-press block h-full rounded-xl border border-edge bg-paper-bright px-5 py-4 transition-colors hover:border-clay")}
              >
                <span className="block font-semibold text-ink">{a.title}</span>
                <span className="mt-1 block text-[0.88rem] text-ink-mute">{a.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TodayBlock({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  const items = children.filter(Boolean);
  return (
    <div className="px-5 py-4">
      <p className="text-[0.8rem] font-semibold uppercase tracking-[0.06em] text-ink-mute">{title}</p>
      {items.length ? (
        <ul className="mt-2 space-y-1.5 text-[0.95rem]">{items}</ul>
      ) : (
        <p className="mt-2 text-[0.95rem] text-ink-mute">{empty}</p>
      )}
    </div>
  );
}
