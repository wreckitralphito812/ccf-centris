import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Pill, Section } from "@/components/ui";
import { getUpcomingEvents, getUpcomingServices } from "@/lib/queries";
import { fmtMonthYear, fmtTime, manilaDateKey } from "@/lib/format";

export const metadata: Metadata = {
  title: "Calendar",
  description:
    "A month view of everything happening at CCF Centris: worship services, classes, sports, and events.",
};

/** Manila-local calendar date for an instant, as YYYY-MM-DD. */
function key(at: string) {
  return manilaDateKey(new Date(at));
}

export default async function CalendarPage({
  searchParams,
}: PageProps<"/events/calendar">) {
  const sp = await searchParams;
  const offsetRaw = Array.isArray(sp.m) ? sp.m[0] : sp.m;
  const offset = Math.max(0, Math.min(5, Number(offsetRaw ?? 0) || 0));

  const [events, services] = await Promise.all([
    getUpcomingEvents(),
    getUpcomingServices(40),
  ]);

  // Build the month grid in Manila time.
  const today = new Date();
  const base = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1),
  );
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();

  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  interface Entry {
    label: string;
    href: string;
    kind: "service" | "event";
  }

  const byDay = new Map<string, Entry[]>();

  for (const s of services) {
    const k = key(s.starts_at);
    byDay.set(k, [
      ...(byDay.get(k) ?? []),
      {
        label: `${fmtTime(s.starts_at)} ${s.title}`,
        href: "/visit/new-here",
        kind: "service",
      },
    ]);
  }
  for (const e of events) {
    const k = key(e.starts_at);
    byDay.set(k, [
      ...(byDay.get(k) ?? []),
      {
        label: `${fmtTime(e.starts_at)} ${e.title}`,
        href: `/events/${e.slug}`,
        kind: "event",
      },
    ]);
  }

  const todayKey = manilaDateKey();
  const monthLabel = fmtMonthYear(new Date(Date.UTC(year, month, 15)));

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="A month at Centris."
        lead="Worship services and everything else on one grid. Services repeat weekly, so most weeks look busier than they feel."
        actions={
          <ButtonLink href="/events" tone="outline" size="lg">
            List view
          </ButtonLink>
        }
      />

      <Section>
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-3xl">{monthLabel}</h2>
            <div className="flex gap-2">
              <NavLink to={offset - 1} disabled={offset === 0}>
                ← Previous
              </NavLink>
              <NavLink to={offset + 1} disabled={offset >= 5}>
                Next →
              </NavLink>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            <span className="flex items-center gap-2 text-[0.82rem] text-ink-mute">
              <span aria-hidden className="h-2.5 w-2.5 bg-clay" />
              Worship service
            </span>
            <span className="flex items-center gap-2 text-[0.82rem] text-ink-mute">
              <span aria-hidden className="h-2.5 w-2.5 bg-sky" />
              Event
            </span>
          </div>

          {/* Desktop grid */}
          <div className="mt-6 hidden overflow-hidden border border-hairline sm:block">
            <div className="grid grid-cols-7 border-b border-hairline bg-paper-bright">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="label px-3 py-3 text-ink-mute">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-hairline">
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`pad-${i}`} className="min-h-28 bg-paper-bright/40" />;
                }
                const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const items = byDay.get(k) ?? [];
                const isToday = k === todayKey;
                return (
                  <div
                    key={k}
                    className={`min-h-28 bg-paper-bright p-2 ${isToday ? "ring-1 ring-inset ring-clay" : ""}`}
                  >
                    <p
                      className={`font-display text-lg leading-none ${isToday ? "text-clay" : "text-ink-mute"}`}
                    >
                      {day}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {items.slice(0, 3).map((it, n) => (
                        <li key={n}>
                          <Link
                            href={it.href}
                            className={`block truncate border-l-2 pl-1.5 text-[0.72rem] leading-tight transition-colors hover:text-clay ${
                              it.kind === "service"
                                ? "border-clay text-ink-soft"
                                : "border-sky text-ink-soft"
                            }`}
                          >
                            {it.label}
                          </Link>
                        </li>
                      ))}
                      {items.length > 3 ? (
                        <li className="pl-1.5 text-[0.7rem] text-ink-mute">
                          +{items.length - 3} more
                        </li>
                      ) : null}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile agenda. A 7-column grid is unusable on a phone. */}
          <div className="mt-6 divide-y divide-hairline border-y border-hairline sm:hidden">
            {cells
              .filter((d): d is number => d !== null)
              .map((day) => {
                const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const items = byDay.get(k) ?? [];
                if (!items.length) return null;
                return (
                  <div key={k} className="flex gap-4 py-4">
                    <p className="font-display w-10 shrink-0 text-2xl leading-none text-clay">
                      {day}
                    </p>
                    <ul className="min-w-0 flex-1 space-y-2">
                      {items.map((it, n) => (
                        <li key={n}>
                          <Link
                            href={it.href}
                            className="block text-[0.9rem] leading-snug text-ink-soft"
                          >
                            {it.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>

          <p className="mt-6 text-[0.85rem] text-ink-mute">
            Times are Manila time. Service times are set by the CCF Centris team
            in the admin.
          </p>
        </Container>
      </Section>
    </>
  );
}

function NavLink({
  to,
  disabled,
  children,
}: {
  to: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="label border border-hairline px-4 py-2 text-ink-mute opacity-50">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={to === 0 ? "/events/calendar" : `/events/calendar?m=${to}`}
      className="label border border-ink px-4 py-2 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
    >
      {children}
    </Link>
  );
}
