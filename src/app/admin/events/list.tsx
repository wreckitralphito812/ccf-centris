import Link from "next/link";
import { AdminHeader, AdminNote } from "../admin-ui";
import { EventButtons, PosterDrop, ScrollToSaved } from "./event-actions";
import { cx } from "@/components/ui";
import { dateText } from "@/lib/announcements";
import { manilaDay } from "@/lib/admin-day";
import { fmtMonthYear } from "@/lib/format";
import type { CcfEvent } from "@/lib/types";

/* The events manager's body (2026-10-08), apart from its data loading so it
   can be previewed with sample events. See ./page.tsx. */

export type View = "upcoming" | "attention" | "calendar" | "hidden" | "past";

const endOf = (e: CcfEvent) => e.ends_at ?? e.starts_at;
const isHidden = (e: CcfEvent) => e.status !== "published" && e.status !== "completed";

/** What a live, promoted event is still missing. */
function gaps(e: CcfEvent): string[] {
  if (e.calendar_only) return [];
  const out: string[] = [];
  if (!e.cover_image_url) out.push("No poster");
  if (!e.registration_url) out.push("No sign-up link");
  // A one-day "all day" date is usually a time nobody has confirmed yet.
  if ((e.dates ?? []).some((d) => d.all_day && (!d.ends_at || manilaDay(d.ends_at) === manilaDay(d.starts_at)))) out.push("Time not set");
  return out;
}

function Chip({ tone, children }: { tone: "clay" | "moss" | "ink" | "sky"; children: React.ReactNode }) {
  const c = {
    clay: "bg-clay-wash text-clay-deep",
    moss: "bg-moss/15 text-moss",
    ink: "bg-ink/10 text-ink-soft",
    sky: "bg-sky-wash text-sky",
  }[tone];
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.78rem] font-semibold", c)}>{children}</span>;
}

function EventRow({ e, past, readOnly, saved }: { e: CcfEvent; past: boolean; readOnly: boolean; saved: boolean }) {
  const hidden = isHidden(e);
  const missing = past || hidden ? [] : gaps(e);
  const dates = e.dates?.length ? e.dates : [{ starts_at: e.starts_at, ends_at: e.ends_at }];
  const shownOnSite = !hidden && !past && !e.calendar_only;
  return (
    <li
      id={`event-${e.id}`}
      className={cx(
        "grid scroll-mt-24 gap-4 p-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:p-5 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_auto]",
        hidden && "bg-mist/60",
        saved && "bg-moss/5 shadow-[inset_4px_0_0_var(--color-moss)]",
      )}
    >
      <div className={cx(hidden || past ? "opacity-70" : undefined)}>
        {e.calendar_only ? (
          // Calendar-only bookings never show a poster, so they get a date block.
          <div className="grid aspect-video w-full place-items-center rounded-lg bg-mist text-center">
            <span>
              <span className="block text-[0.85rem] font-semibold uppercase tracking-wide text-ink-mute">
                {new Date(e.starts_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short" })}
              </span>
              <span className="block text-[2.2rem] font-extrabold leading-none text-ink">
                {new Date(e.starts_at).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", day: "numeric" })}
              </span>
            </span>
          </div>
        ) : (
          <PosterDrop id={e.id} title={e.title} src={e.cover_image_url} readOnly={readOnly} />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {saved ? <Chip tone="moss">✓ Saved</Chip> : null}
          {hidden ? <Chip tone="ink">Hidden</Chip> : past ? <Chip tone="ink">Ended</Chip> : e.calendar_only ? <Chip tone="ink">Calendar only</Chip> : <Chip tone="moss">On the site</Chip>}
          {e.category && !e.calendar_only ? <Chip tone="clay">{e.category}</Chip> : null}
          {missing.map((m) => (
            <Chip key={m} tone="sky">
              {m}
            </Chip>
          ))}
        </div>
        <h3 className="mt-2 text-[1.15rem] font-bold leading-snug text-ink">
          {readOnly ? (
            e.title
          ) : (
            <Link href={`/admin/events/${e.id}`} className="hover:text-clay">
              {e.title}
            </Link>
          )}
        </h3>
        <ul className="mt-1 space-y-0.5 text-[0.92rem] text-ink-soft">
          {dates.slice(0, 4).map((d) => (
            <li key={d.starts_at}>{dateText(d)}</li>
          ))}
          {dates.length > 4 ? <li className="text-ink-mute">+ {dates.length - 4} more dates</li> : null}
        </ul>
        <p className="mt-1 text-[0.88rem] text-ink-mute">{[e.location_note, e.ministry].filter(Boolean).join(" · ")}</p>
      </div>

      <div className="flex flex-wrap items-start gap-2 sm:col-start-2 xl:col-start-auto xl:w-[21rem] xl:justify-end">
        {readOnly ? null : (
          <Link
            href={`/admin/events/${e.id}`}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-clay px-4 text-[0.9rem] font-semibold text-paper-bright hover:bg-clay-deep"
          >
            Edit
          </Link>
        )}
        {shownOnSite ? (
          <a
            href={`/events/${e.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-edge px-3.5 text-[0.9rem] font-semibold text-ink hover:border-clay"
          >
            View ↗
          </a>
        ) : null}
        {readOnly ? null : <EventButtons id={e.id} title={e.title} hidden={hidden} />}
      </div>
    </li>
  );
}

/** Rows grouped under month headings. */
function MonthGroups({ list, past, readOnly, savedId }: { list: CcfEvent[]; past: boolean; readOnly: boolean; savedId?: string }) {
  const groups = new Map<string, CcfEvent[]>();
  for (const e of list) {
    const k = fmtMonthYear(new Date(e.starts_at));
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  return (
    <div className="space-y-6">
      {[...groups].map(([month, rows]) => (
        <section key={month}>
          <h2 className="mb-2 text-[0.95rem] font-bold text-ink-soft">{month}</h2>
          <ul className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-paper-bright">
            {rows.map((e) => (
              <EventRow key={e.id} e={e} past={past} readOnly={readOnly} saved={e.id === savedId} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function EventsManager({
  all,
  waiting,
  view: viewParam,
  q,
  readOnly,
  notice,
  savedId,
  added = false,
}: {
  all: CcfEvent[];
  waiting: number;
  view?: string;
  q: string;
  readOnly: boolean;
  notice?: React.ReactNode;
  /** The event just saved from the form, to confirm and scroll to. */
  savedId?: string;
  added?: boolean;
}) {
  const now = new Date().toISOString();
  const match = (e: CcfEvent) =>
    !q || [e.title, e.ministry, e.location_note, e.category].some((s) => s?.toLowerCase().includes(q.toLowerCase()));
  const found = all.filter(match);
  const upcoming = found.filter((e) => endOf(e) >= now);
  const lists: Record<View, CcfEvent[]> = {
    upcoming,
    attention: upcoming.filter((e) => !isHidden(e) && gaps(e).length > 0),
    calendar: upcoming.filter((e) => e.calendar_only),
    hidden: upcoming.filter(isHidden),
    past: found.filter((e) => endOf(e) < now).reverse(),
  };
  const tabs: { id: View; label: string }[] = [
    { id: "upcoming", label: "Coming up" },
    { id: "attention", label: "Needs details" },
    { id: "calendar", label: "Calendar only" },
    { id: "hidden", label: "Hidden" },
    { id: "past", label: "Past" },
  ];
  const view: View = tabs.find((t) => t.id === viewParam)?.id ?? "upcoming";
  const saved = savedId ? (all.find((e) => e.id === savedId) ?? null) : null;
  const list = lists[view];
  const href = (v: View) => `/admin/events?view=${v}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  const empty: Record<View, string> = {
    upcoming: q ? `Nothing coming up matches "${q}".` : "Nothing coming up. Add an event to put it on What's Happening.",
    attention: "Every event on the site has its poster, sign-up link and times.",
    calendar: "No calendar-only bookings coming up.",
    hidden: "Nothing hidden.",
    past: q ? `No past events match "${q}".` : "No past events yet.",
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Events"
        lead="Everything on What's Happening and the calendar. Drop a poster on an event to add it, or open it to edit the details."
        action={
          readOnly ? null : (
            <Link
              href="/admin/events/new"
              className="btn-press inline-flex min-h-11 items-center rounded-lg bg-clay px-5 text-[0.98rem] font-semibold text-paper-bright hover:bg-clay-deep"
            >
              + Add event
            </Link>
          )
        }
      />

      {notice ? <AdminNote>{notice}</AdminNote> : null}

      {saved ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-moss/30 bg-moss/10 px-4 py-3 text-[0.95rem] text-ink">
          <span>
            <span className="font-bold text-moss">✓ {added ? "Added" : "Saved"}</span> <span className="font-semibold">{saved.title}</span>
            <span className="text-ink-soft">
              {" "}
              ·{" "}
              {isHidden(saved)
                ? "hidden: it's not on the site until you show it."
                : endOf(saved) < now
                  ? "it has ended, so it's under Past."
                  : saved.calendar_only
                    ? "on the month calendar."
                    : "live on What's Happening."}
            </span>
          </span>
          <span className="flex gap-4 font-semibold">
            {!isHidden(saved) && !saved.calendar_only && endOf(saved) >= now ? (
              <a href={`/events/${saved.slug}`} target="_blank" rel="noreferrer" className="text-clay hover:text-clay-deep">
                View on site ↗
              </a>
            ) : null}
            <Link href={`/admin/events/${saved.id}`} className="text-clay hover:text-clay-deep">
              Edit again
            </Link>
            {added ? (
              <Link href="/admin/events/new" className="text-clay hover:text-clay-deep">
                + Add another
              </Link>
            ) : null}
          </span>
          <ScrollToSaved id={saved.id} />
        </div>
      ) : null}

      {waiting ? (
        <Link
          href="/admin/announcements?tab=waiting"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-clay/30 bg-clay-wash px-4 py-3 text-[0.95rem] text-clay-deep hover:border-clay"
        >
          <span>
            <span className="font-bold">{waiting}</span> {waiting === 1 ? "announcement from a ministry rep is" : "announcements from ministry reps are"} waiting for review.
          </span>
          <span className="font-semibold">Review →</span>
        </Link>
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="no-bar -mx-1 flex gap-1 overflow-x-auto px-1" aria-label="Filter events">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={href(t.id)}
              aria-current={view === t.id ? "page" : undefined}
              className={cx(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-[0.92rem] font-semibold transition-colors",
                view === t.id ? "bg-ink text-paper-bright" : "border border-hairline bg-paper-bright text-ink-soft hover:border-ink",
              )}
            >
              {t.label}
              <span className={cx("rounded-full px-1.5 text-[0.78rem] tabular-nums", view === t.id ? "bg-paper-bright/20" : t.id === "attention" && lists.attention.length ? "bg-sky-wash text-sky" : "bg-ink/10")}>
                {lists[t.id].length}
              </span>
            </Link>
          ))}
        </nav>
        <form action="/admin/events" className="flex gap-2" role="search">
          <input type="hidden" name="view" value={view} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search events"
            aria-label="Search events"
            className="calm-input min-h-10 w-full px-3 text-[0.95rem] lg:w-64"
          />
          {q ? (
            <Link href={`/admin/events?view=${view}`} className="inline-flex min-h-10 items-center px-2 text-[0.9rem] font-semibold text-ink-mute hover:text-ink">
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      {list.length ? (
        <MonthGroups list={list} past={view === "past"} readOnly={readOnly} savedId={savedId} />
      ) : (
        <div className="rounded-xl border border-dashed border-edge bg-paper-bright px-5 py-12 text-center">
          <p className="text-[0.98rem] text-ink-soft">{empty[view]}</p>
          {view === "upcoming" && !q && !readOnly ? (
            <Link href="/admin/events/new" className="mt-3 inline-block font-semibold text-clay hover:text-clay-deep">
              + Add event
            </Link>
          ) : null}
        </div>
      )}

      <AdminNote>
        <strong>Hide</strong> takes an event off the site and the calendar but keeps it here, so you can show it again.{" "}
        <strong>Calendar only</strong> events are bookings by other satellites or pastors: on the month calendar, with no page or sign-up. Events
        leave the site by themselves after their last date.
      </AdminNote>
    </div>
  );
}
