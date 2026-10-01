import { IconLine, StatusBadge } from "@/components/booking";
import { FloorPlanDrawing } from "@/components/floor-plan";
import { statusBadge, whenLabel } from "@/lib/booking-status";
import { nightLabel, type NightOption } from "@/lib/dgroup-tables";
import { fmtDayLong, fmtTime } from "@/lib/format";
import type { Upcoming } from "@/lib/my-bookings";
import type { MyBooking } from "@/lib/queries";
import { BookingActions } from "./booking-actions";

/* The pieces of My reservations (2026-09-30): Next up, the Later rows that
   open to Manage, and the folded Past rows. */

/** The soonest booking, with everything you can do with it. */
export function NextUp({
  item,
  today,
  nights,
  rebookTarget,
  reference,
}: {
  item: Upcoming;
  today: string;
  nights: NightOption[];
  rebookTarget: string | null;
  reference: string;
}) {
  const badge = statusBadge(item.status);
  const t = item.table;
  return (
    <article aria-labelledby="next-h" className="calm-card p-7 sm:p-9">
      {/* Landscape on laptops (2026-10-01): details and actions left, the plan right. */}
      <div className={t ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10" : undefined}>
      <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.85rem] font-semibold uppercase tracking-[0.08em] text-clay">
          Next up · {whenLabel(item.date, today)}
        </p>
        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
      </div>
      <h2 id="next-h" className="mt-3 text-[1.5rem] font-semibold leading-snug tracking-[-0.01em] text-ink">
        {item.title}
      </h2>
      <div className="mt-5 space-y-3">
        <IconLine icon="calendar">{nightLabel(item.date)}</IconLine>
        <IconLine icon="clock">{item.time}</IconLine>
        <IconLine icon="people">
          {item.people} {item.people === 1 ? "person" : "people"}
        </IconLine>
        {item.room?.facility_name ? <IconLine icon="pin">{item.room.facility_name}</IconLine> : null}
      </div>
      <div className="mt-7 border-t border-rule pt-6">
        <BookingActions item={item} nights={nights} rebookTarget={rebookTarget} reference={reference} />
      </div>
      </div>
      {t ? (
        <div className="mt-6 flex justify-center self-start overflow-hidden rounded-2xl bg-mist p-4 lg:mt-0">
          <div className="sm:hidden">
            <FloorPlanDrawing room={t.room_slug} highlight={t.table_labels} width={250} />
          </div>
          <div className="hidden sm:block lg:hidden">
            <FloorPlanDrawing room={t.room_slug} highlight={t.table_labels} width={440} />
          </div>
          <div className="hidden lg:block">
            <FloorPlanDrawing room={t.room_slug} highlight={t.table_labels} width={420} />
          </div>
        </div>
      ) : null}
      </div>
    </article>
  );
}

/** "WED / Oct 7" in a small pale block. */
function DateBlock({ date }: { date: string }) {
  const [weekday, rest] = nightLabel(date).split(", ");
  return (
    <span className="grid w-16 shrink-0 place-items-center rounded-xl bg-clay-wash py-2 text-center text-clay-deep">
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.06em]">{weekday.slice(0, 3)}</span>
      <span className="text-[0.95rem] font-semibold">{rest}</span>
    </span>
  );
}

/** A past, declined or cancelled room booking. Past Dgroup tables aren't kept here. */
export function PastRow({ r }: { r: MyBooking }) {
  // Pending or approved rooms only land here once they've ended.
  const badge =
    r.status === "approved" || r.status === "pending"
      ? { label: "Past", tone: "grey" as const }
      : statusBadge(r.status);
  return (
    <li className="flex items-center gap-4 px-6 py-4">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[1rem] font-semibold text-ink-soft">
          {r.activity_name ?? r.facility_name ?? r.court_name ?? "Reservation"}
        </span>
        <span className="block text-[0.9rem] text-ink-mute">
          {fmtDayLong(r.starts_at)}, {fmtTime(r.starts_at)} · {r.facility_name ?? r.court_name}
        </span>
      </span>
      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
    </li>
  );
}

/** One later booking: a row that opens to the same actions as Next up. */
export function LaterRow({
  item,
  nights,
  rebookTarget,
  reference,
}: {
  item: Upcoming;
  nights: NightOption[];
  rebookTarget: string | null;
  reference: string;
}) {
  const badge = statusBadge(item.status);
  return (
    <li>
      <details className="group">
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 px-6 py-4 hover:bg-mist [&::-webkit-details-marker]:hidden">
          <DateBlock date={item.date} />
          <span className="min-w-0 flex-1">
            <span className="block text-[1.05rem] font-semibold leading-snug text-ink">{item.title}</span>
            <span className="block text-[0.92rem] text-ink-mute">
              {item.time} · {item.people} {item.people === 1 ? "person" : "people"}
            </span>
          </span>
          <span className="hidden sm:block">
            <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
          </span>
          <span className="shrink-0 text-[0.95rem] font-semibold text-clay group-open:hidden">Manage</span>
          <span className="hidden shrink-0 text-[0.95rem] font-semibold text-ink-mute group-open:inline">Close</span>
        </summary>
        <div className="px-6 pb-6">
          <span className="mb-4 inline-block sm:hidden">
            <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
          </span>
          <BookingActions item={item} nights={nights} rebookTarget={rebookTarget} reference={reference} />
        </div>
      </details>
    </li>
  );
}
