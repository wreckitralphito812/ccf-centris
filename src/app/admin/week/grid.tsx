import Link from "next/link";
import { AdminHeader, AdminNote } from "../admin-ui";
import { cx } from "@/components/ui";
import type { RoomBlock } from "@/lib/queries";
import { manilaDay, manilaMinutesOf, shiftDay, type DayRoomBooking, type DayTable } from "@/lib/admin-day";
import { DGROUP_SLOTS, WEEKDAY_NAMES } from "@/lib/dgroup-tables";
import { MINISTRY_ROOMS, timeLabel } from "@/lib/ministry-rooms";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const short = (d: string) => {
  const x = new Date(`${d}T00:00:00Z`);
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
};

/** The week board's layout, given the week's rows (page.tsx reads them). */
export function WeekGrid({
  days,
  today,
  tables,
  rooms,
  blocks,
  connected,
}: {
  days: string[];
  today: string;
  tables: DayTable[];
  rooms: DayRoomBooking[];
  blocks: RoomBlock[];
  connected: boolean;
}) {
  const live = rooms.filter((r) => ["pending", "approved"].includes(r.status));
  const awaiting = live.filter((r) => r.status === "pending" && days.includes(manilaDay(r.starts_at))).length;
  const tablesOn = (d: string, slot: string) =>
    tables.filter((t) => t.booked_on === d && t.slot_id === slot && ["pending", "confirmed"].includes(t.status)).length;

  const nav = "btn-press inline-flex min-h-10 items-center rounded-lg border border-edge bg-paper-bright px-3.5 text-[0.92rem] font-semibold text-ink hover:border-clay hover:text-clay";

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Week"
        lead="Rooms and Dgroup tables, Monday to Saturday. Open a day to approve requests and see the floor plans."
      />
      {!connected ? <AdminNote>Not connected to a database.</AdminNote> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/week?d=${shiftDay(days[0], -7)}`} className={nav} aria-label="Previous week">
          ←
        </Link>
        <h2 className="mx-2 font-display text-2xl font-bold">
          {short(days[0])} – {short(days[5])}
        </h2>
        <Link href={`/admin/week?d=${shiftDay(days[0], 7)}`} className={nav} aria-label="Next week">
          →
        </Link>
        {!days.includes(today) ? (
          <Link href="/admin/week" className={nav}>
            This week
          </Link>
        ) : null}
        {awaiting ? (
          <Link href="/admin/reservations" className="ml-auto text-[0.92rem] font-semibold text-sky underline underline-offset-4">
            {awaiting} {awaiting === 1 ? "request" : "requests"} awaiting approval this week
          </Link>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-hairline bg-paper-bright">
        <table className="w-full min-w-[60rem] table-fixed border-collapse text-[0.85rem]">
          <thead>
            <tr>
              <th className="w-40 border-b border-hairline px-3 py-2.5 text-left font-semibold text-ink-mute">Room</th>
              {days.map((d) => (
                <th key={d} className={cx("border-b border-l border-hairline px-2 py-2.5 text-left", d === today && "bg-clay-wash")}>
                  <Link href={`/admin/today?d=${d}`} className="font-semibold text-ink hover:text-clay">
                    {WEEKDAY_NAMES[new Date(`${d}T00:00:00Z`).getUTCDay()].slice(0, 3)} {short(d)}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-mist/60">
              <td className="border-b border-hairline px-3 py-2.5 align-top font-semibold text-ink">Dgroup tables</td>
              {days.map((d, i) => (
                <td key={d} className="border-b border-l border-hairline px-2 py-2.5 align-top text-ink-soft">
                  {i < 5 ? (
                    <Link href={`/admin/today?d=${d}`} className="block space-y-0.5 hover:text-clay">
                      {DGROUP_SLOTS.map((s) => (
                        <span key={s.id} className="block tabular-nums">
                          {s.label.split(" – ")[0]} · {tablesOn(d, s.id) || "—"}
                        </span>
                      ))}
                    </Link>
                  ) : (
                    <span className="text-ink-mute">—</span>
                  )}
                </td>
              ))}
            </tr>
            {MINISTRY_ROOMS.map((room) => (
              <tr key={room.slug}>
                <td className="border-b border-hairline px-3 py-2.5 align-top font-semibold text-ink">{room.name}</td>
                {days.map((d) => {
                  const items = [
                    ...live
                      .filter((r) => r.facility_name === room.name && manilaDay(r.starts_at) === d)
                      .map((r) => ({ key: r.id, from: manilaMinutesOf(r.starts_at), to: manilaMinutesOf(r.ends_at), title: r.activity_name ?? "Booking", tone: r.status })),
                    ...blocks
                      .filter((b) => b.facility_name === room.name && manilaDay(b.starts_at) === d)
                      .map((b) => ({ key: b.id, from: manilaMinutesOf(b.starts_at), to: manilaMinutesOf(b.ends_at), title: b.reason ?? "Blocked", tone: "blocked" })),
                  ].sort((a, b) => a.from - b.from);
                  return (
                    <td key={d} className="border-b border-l border-hairline px-1.5 py-1.5 align-top">
                      {items.length ? (
                        <ul className="space-y-1">
                          {items.map((it) => (
                            <li key={it.key}>
                              <Link
                                href={`/admin/today?d=${d}`}
                                className={cx(
                                  "block rounded-md px-2 py-1 leading-tight",
                                  it.tone === "approved" && "bg-clay text-paper-bright",
                                  it.tone === "pending" && "border border-dashed border-sky/60 bg-sky-wash text-sky",
                                  it.tone === "blocked" && "bg-ink/10 text-ink-soft",
                                )}
                              >
                                <span className="block truncate font-semibold">
                                  {it.tone === "blocked" ? `Blocked · ${it.title}` : it.title}
                                </span>
                                <span className="block truncate opacity-90">
                                  {timeLabel(it.from)} – {timeLabel(it.to)}
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="block px-1.5 py-1 text-ink-mute">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-[0.82rem] text-ink-mute">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-clay" /> Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-dashed border-sky/60 bg-sky-wash" /> Awaiting approval</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-ink/10" /> Blocked</span>
      </p>
    </div>
  );
}
