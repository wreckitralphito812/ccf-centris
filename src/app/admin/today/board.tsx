import Link from "next/link";
import { AdminHeader, AdminNote, AdminPanel, Stat } from "../admin-ui";
import { QueueActions } from "../queue-actions";
import { PrintButton } from "./print-button";
import { FloorPlanDrawing } from "@/components/floor-plan";
import { cx } from "@/components/ui";
import { setReservationStatus } from "@/app/actions/admin";
import { tablesLabel, WEEKDAY_NAMES } from "@/lib/dgroup-tables";
import { timeLabel } from "@/lib/ministry-rooms";
import {
  blockPosition,
  buildDayBoard,
  DAY_END,
  DAY_START,
  manilaDay,
  shiftDay,
  weekOf,
  type DayRoomBooking,
  type DayTable,
} from "@/lib/admin-day";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function longDate(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAY_NAMES[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** The Today board's layout, given the day's rows (page.tsx reads them). */
export function TodayBoard({
  date,
  today,
  tables,
  rooms,
  readOnly,
  connected,
}: {
  date: string;
  today: string;
  tables: DayTable[];
  rooms: DayRoomBooking[];
  readOnly: boolean;
  connected: boolean;
}) {
  const board = buildDayBoard(date, tables, rooms);

  const week = weekOf(date);
  const countOn = (d: string) =>
    tables.filter((t) => t.booked_on === d && ["pending", "confirmed"].includes(t.status)).length +
    rooms.filter((r) => ["pending", "approved"].includes(r.status) && manilaDay(r.starts_at) === d).length;

  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const dgroupDay = weekday >= 1 && weekday <= 5;
  const pending = board.rooms.flatMap((r) => r.blocks.filter((b) => b.status === "pending"));

  const navLink = "btn-press inline-flex min-h-10 items-center rounded-lg border border-edge bg-paper-bright px-3.5 text-[0.92rem] font-semibold text-ink transition-colors hover:border-clay hover:text-clay";

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Today"
        lead="Every booking for one day: Dgroup tables on the floor plans, room requests on each room's timeline."
        action={<PrintButton />}
      />

      {!connected ? (
        <AdminNote>
          Not connected to a database. Set <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> to see
          live bookings.
        </AdminNote>
      ) : null}

      {/* Day picker */}
      <div className="space-y-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/today?d=${shiftDay(date, -1)}`} className={navLink} aria-label="Previous day">
            ←
          </Link>
          <h2 className="mx-2 font-display text-2xl font-bold text-ink">{longDate(date)}</h2>
          <Link href={`/admin/today?d=${shiftDay(date, 1)}`} className={navLink} aria-label="Next day">
            →
          </Link>
          {date !== today ? (
            <Link href="/admin/today" className={cx(navLink, "ml-auto")}>
              Back to today
            </Link>
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {week.map((d) => {
            const n = countOn(d);
            const dd = new Date(`${d}T00:00:00Z`);
            return (
              <Link
                key={d}
                href={`/admin/today?d=${d}`}
                aria-current={d === date ? "date" : undefined}
                className={cx(
                  "rounded-lg border px-3 py-2.5 text-center transition-colors",
                  d === date ? "border-clay bg-clay text-paper-bright" : "border-edge bg-paper-bright text-ink hover:border-clay/60",
                )}
              >
                <span className="block text-[0.78rem] font-semibold uppercase tracking-[0.06em] opacity-80">
                  {WEEKDAY_NAMES[dd.getUTCDay()].slice(0, 3)}
                  {d === today ? " · today" : ""}
                </span>
                <span className="block text-[1.15rem] font-bold">{dd.getUTCDate()}</span>
                <span className="block text-[0.78rem] opacity-80">{n ? `${n} booked` : "—"}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Printed heading */}
      <p className="hidden text-[1.4rem] font-bold print:block">CCF Centris · {longDate(date)}</p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Dgroups" value={board.stats.groups} tone="clay" />
        <Stat label="People at tables" value={board.stats.people} />
        <Stat label="Rooms booked" value={board.stats.roomsBooked} tone="moss" />
        <Stat label="Awaiting approval" value={board.stats.awaiting} />
      </div>

      {/* Dgroup tables */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold">Dgroup tables</h2>
        {!dgroupDay ? (
          <p className="text-[0.95rem] text-ink-mute">Dgroup tables are booked Monday to Friday.</p>
        ) : (
          board.slots.map(({ slot, rooms: slotRooms, groups }) =>
            groups === 0 ? (
              <p key={slot.id} className="rounded-lg border border-dashed border-edge bg-paper-bright px-5 py-3.5 text-[0.95rem] text-ink-mute">
                <span className="font-semibold text-ink">{slot.label}</span> · no tables booked
              </p>
            ) : (
              <AdminPanel key={slot.id} title={`${slot.label} · ${groups} ${groups === 1 ? "group" : "groups"}`} className="break-inside-avoid">
                <div className="grid gap-6 p-5 xl:grid-cols-2">
                  {slotRooms.map((r) => (
                    <div key={r.slug} className={cx(r.bookings.length === 0 && "hidden xl:block")}>
                      <p className="font-semibold text-ink">
                        {r.name}
                        <span className="font-normal text-ink-mute">
                          {" "}
                          · {r.bookings.length ? `${r.bookings.length} booked` : "free"}
                        </span>
                      </p>
                      {r.bookings.length ? (
                        <>
                          <div className="mt-3 flex justify-center rounded-xl bg-mist p-3">
                            <FloorPlanDrawing room={r.slug} highlight={r.labels} width={360} />
                          </div>
                          <ul className="mt-3 divide-y divide-rule rounded-xl border border-edge">
                            {r.bookings.map((b) => (
                              <li key={b.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-[0.92rem]">
                                <span className="w-24 shrink-0 font-semibold text-clay">{tablesLabel(b.table_labels)}</span>
                                <span className="font-semibold text-ink">{b.leader_name}</span>
                                <span className="text-ink-mute">
                                  {b.group_size} {b.group_size === 1 ? "person" : "people"} · {b.contact_mobile}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </div>
                  ))}
                </div>
              </AdminPanel>
            ),
          )
        )}
      </section>

      {/* Rooms */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-bold">Rooms</h2>
        <AdminPanel>
          <div className="overflow-x-auto p-5">
            <div className="min-w-[44rem]">
              {/* Hour ticks */}
              <div className="relative ml-40 h-6 text-[0.78rem] text-ink-mute">
                {[9, 12, 15, 18, 21].map((h) => (
                  <span
                    key={h}
                    className={cx("absolute whitespace-nowrap", h === 9 ? "" : h === 21 ? "-translate-x-full" : "-translate-x-1/2")}
                    style={{ left: `${blockPosition(h * 60, h * 60).left}%` }}
                  >
                    {timeLabel(h * 60)}
                  </span>
                ))}
              </div>
              <ul className="space-y-2">
                {board.rooms.map((room) => (
                  <li key={room.name} className="flex items-stretch gap-3">
                    <span className="flex w-37 shrink-0 items-center text-[0.92rem] font-semibold text-ink">{room.name}</span>
                    <div className="relative h-16 flex-1 rounded-lg bg-mist">
                      {[12, 15, 18].map((h) => (
                        <span key={h} aria-hidden className="absolute inset-y-0 w-px bg-edge" style={{ left: `${blockPosition(h * 60, h * 60).left}%` }} />
                      ))}
                      {room.blocks.map((b) => {
                        const pos = blockPosition(b.from, b.to);
                        const pendingBlock = b.status === "pending";
                        return (
                          <div
                            key={b.id}
                            title={`${b.activity_name ?? "Booking"} · ${timeLabel(b.from)} – ${timeLabel(b.to)}`}
                            className={cx(
                              "absolute inset-y-1 overflow-hidden rounded-md px-2.5 py-1.5 text-[0.8rem] leading-tight",
                              pendingBlock ? "border-2 border-dashed border-sky/60 bg-sky-wash text-sky" : "bg-clay text-paper-bright",
                            )}
                            style={{ left: `${pos.left}%`, width: `${pos.width}%` }}
                          >
                            <span className="block truncate font-semibold">{b.activity_name ?? "Booking"}</span>
                            <span className="block truncate opacity-90">
                              {timeLabel(b.from)} – {timeLabel(b.to)} · {b.participants}
                              {pendingBlock ? " · awaiting" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[0.82rem] text-ink-mute">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-clay" /> Confirmed</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border-2 border-dashed border-sky/60 bg-sky-wash" /> Awaiting approval</span>
                <span>{timeLabel(DAY_START)} – {timeLabel(DAY_END)}</span>
              </p>
            </div>
          </div>
        </AdminPanel>

        {pending.length ? (
          <AdminPanel title="Awaiting approval on this day" className="print:hidden">
            <ul className="divide-y divide-rule">
              {pending.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                  <span className="text-[0.92rem]">
                    <span className="font-semibold text-ink">{b.activity_name ?? "Booking"}</span>
                    <span className="text-ink-mute">
                      {" "}
                      · {b.facility_name} · {timeLabel(b.from)} – {timeLabel(b.to)} · {b.participants} people ·{" "}
                      {b.contact_name}
                      {b.organization ? ` (${b.organization})` : ""}
                    </span>
                  </span>
                  {readOnly ? (
                    <span className="label text-ink-mute">Read-only</span>
                  ) : (
                    <QueueActions
                      id={b.id}
                      current={b.status}
                      transitions={[
                        { label: "Approve", status: "approved", tone: "go" },
                        { label: "Decline", status: "rejected", tone: "stop" },
                      ]}
                      onSet={setReservationStatus}
                    />
                  )}
                </li>
              ))}
            </ul>
          </AdminPanel>
        ) : null}
      </section>
    </div>
  );
}
