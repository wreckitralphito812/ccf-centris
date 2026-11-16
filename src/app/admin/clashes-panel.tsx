import Link from "next/link";
import type { Clash, ClashSide } from "@/lib/clashes";
import { WEEKDAY_NAMES } from "@/lib/dgroup-tables";
import { timeLabel } from "@/lib/ministry-rooms";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (d: string) => {
  const x = new Date(`${d}T00:00:00Z`);
  return `${WEEKDAY_NAMES[x.getUTCDay()].slice(0, 3)} ${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
};

const KIND: Record<ClashSide["kind"], string> = { event: "event", request: "room request", rental: "court rental" };

function Side({ s }: { s: ClashSide }) {
  return (
    <>
      <Link href={s.href} className="font-semibold text-ink underline underline-offset-4 hover:text-clay">
        {s.title}
      </Link>
      <span className="text-ink-mute"> ({s.pending ? "room request, waiting" : KIND[s.kind]})</span>
    </>
  );
}

/**
 * The clashes on a stretch of the schedule (Adrian, 2026-11-16), in CCF
 * maroon at the top of Today, This week and the Room calendar. Nothing shows
 * when there are none. Each side links to the event or booking to change.
 */
export function ClashesPanel({ clashes, showDate = false }: { clashes: Clash[]; showDate?: boolean }) {
  if (!clashes.length) return null;
  return (
    <section aria-labelledby="clashes-h" className="rounded-xl border-2 border-sky/40 bg-sky-wash print:hidden">
      <h2 id="clashes-h" className="px-5 pt-4 text-[1.05rem] font-bold text-sky">
        {clashes.length === 1 ? "1 clash" : `${clashes.length} clashes`}: two bookings in the same room at the same time
      </h2>
      <ul className="divide-y divide-sky/15 px-5 pb-3">
        {clashes.map((c) => (
          <li key={`${c.date}-${c.room}-${c.a.href}-${c.b.href}`} className="py-2.5 text-[0.92rem] leading-relaxed text-ink-soft">
            <span className="font-semibold text-sky">
              {showDate ? `${dayLabel(c.date)} · ` : ""}
              {c.roomName} · {timeLabel(c.from)} – {timeLabel(c.to)}
            </span>
            <span className="block sm:inline sm:before:content-['_·_']">
              <Side s={c.a} /> and <Side s={c.b} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
