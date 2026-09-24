import Link from "next/link";
import type { CcfEvent, Dgroup, Facility, Message, Service } from "@/lib/types";
import {
  AUDIENCE_LABEL,
  MODE_LABEL,
  dayName,
  fmtDate,
  fmtDayShort,
  fmtDuration,
  fmtPeso,
  fmtTime,
  fmtTimeRange,
} from "@/lib/format";
import { Pill, cx } from "./ui";
import { YouTubeThumb } from "./youtube-thumb";

/* --- Message ---------------------------------------------------------------- */

/**
 * Deterministic cover art, used only when a message has no real thumbnail.
 *
 * The label is laid out to FIT: it wraps, balances, and its size steps down as
 * the title gets longer, so a long series name never crops mid-word. Real
 * YouTube thumbnails are always preferred over this.
 */
export function MessageArt({
  seed,
  className,
  label,
}: {
  seed: string;
  className?: string;
  label?: string;
}) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  // Large flat panels, so the exact CCF brand teal is correct here.
  const palettes = [
    ["#00a6b6", "#ffffff"],
    ["#72042c", "#f4f7f7"],
    ["#10262b", "#00a6b6"],
    ["#007682", "#e6eef0"],
    ["#4a5d3a", "#ffffff"],
  ];
  const [bg, fg] = palettes[h % palettes.length];
  const rot = (h % 5) - 2;

  // Longer titles get smaller type. Keeps every label inside the panel.
  const len = label?.length ?? 0;
  const size =
    len > 34
      ? "clamp(0.85rem, 4.4cqw, 1.35rem)"
      : len > 20
        ? "clamp(1rem, 6cqw, 1.9rem)"
        : "clamp(1.2rem, 8cqw, 2.6rem)";

  return (
    <div
      className={cx("relative overflow-hidden @container", className)}
      style={{ background: bg }}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(${fg} 1px, transparent 1.2px)`,
          backgroundSize: "7px 7px",
        }}
      />
      {label ? (
        <span className="absolute inset-0 grid place-items-center p-[8%]">
          <span
            className="font-display text-center font-bold leading-[1.02] text-balance"
            style={{
              color: fg,
              fontSize: size,
              transform: `rotate(${rot}deg)`,
              opacity: 0.92,
            }}
          >
            {label}
          </span>
        </span>
      ) : null}
    </div>
  );
}

export function MessageCard({ m, compact }: { m: Message; compact?: boolean }) {
  return (
    <article className="group">
      <Link href={`/watch/messages/${m.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden border border-hairline">
          {m.sermon_video_key ? (
            <YouTubeThumb
              videoId={m.sermon_video_key}
              alt={m.title}
              className="h-full w-full"
            />
          ) : (
            <MessageArt
              seed={m.slug}
              label={m.series?.title}
              className="h-full w-full"
            />
          )}
          {m.duration_seconds ? (
            <span className="label absolute bottom-2 right-2 bg-night/85 px-2 py-1 text-paper-bright tabular">
              {fmtDuration(m.duration_seconds)}
            </span>
          ) : null}
        </div>
        <div className="mt-3.5">
          {m.series ? (
            <p className="label text-clay">{m.series.title}</p>
          ) : null}
          <h3
            className={cx(
              "font-display mt-1.5 leading-tight group-hover:text-clay",
              compact ? "text-lg" : "text-xl sm:text-2xl",
            )}
          >
            {m.title}
          </h3>
          <p className="mt-1.5 text-[0.85rem] text-ink-mute">
            {m.speaker?.name}
            {m.speaker ? " · " : ""}
            {fmtDate(m.preached_on)}
          </p>
          {!compact && m.scripture ? (
            <p className="mt-1 text-[0.85rem] italic text-ink-soft">{m.scripture}</p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

/* --- Event ------------------------------------------------------------------ */

export function EventCard({ e }: { e: CcfEvent }) {
  const full = e.capacity !== null && e.seats_taken >= e.capacity;
  return (
    <article className="group flex h-full flex-col border border-hairline bg-paper-bright hover:border-ink">
      <Link href={`/events/${e.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[16/9] overflow-hidden">
          <MessageArt seed={e.slug} label={e.category ?? "Event"} className="h-full w-full" />
          <div className="absolute left-0 top-0 bg-paper-bright px-3 py-2 text-center">
            <p className="font-display text-2xl leading-none">
              {new Date(e.starts_at).toLocaleDateString("en-PH", {
                timeZone: "Asia/Manila",
                day: "numeric",
              })}
            </p>
            <p className="label mt-0.5 text-ink-mute">
              {new Date(e.starts_at).toLocaleDateString("en-PH", {
                timeZone: "Asia/Manila",
                month: "short",
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex flex-wrap items-center gap-2">
            {e.category ? <Pill tone="muted">{e.category}</Pill> : null}
            {full ? <Pill tone="clay">Waitlist</Pill> : null}
          </div>
          <h3 className="font-display mt-3 text-xl leading-tight group-hover:text-clay">
            {e.title}
          </h3>
          {e.summary ? (
            <p className="mt-2 line-clamp-2 text-[0.88rem] leading-relaxed text-ink-soft">
              {e.summary}
            </p>
          ) : null}
          <div className="mt-auto pt-4 text-[0.82rem] text-ink-mute">
            <p>{fmtTimeRange(e.starts_at, e.ends_at)}</p>
            {e.location_note ? <p className="mt-0.5">{e.location_note}</p> : null}
            <p className="mt-1.5 font-semibold text-ink">{fmtPeso(e.price_cents)}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}

/* --- Service ---------------------------------------------------------------- */

export function ServiceRow({ s, highlight }: { s: Service; highlight?: boolean }) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-hairline py-5",
        highlight && "bg-clay/5 px-4",
      )}
    >
      <p className="font-display w-32 shrink-0 text-2xl leading-none">
        {fmtTime(s.starts_at)}
      </p>
      <div className="min-w-0 flex-1">
        <p className="text-[0.95rem] font-semibold">{s.title}</p>
        <p className="mt-0.5 text-[0.85rem] text-ink-mute">
          {s.venue?.name}
          {s.speaker ? ` · ${s.speaker.name}` : ""}
        </p>
      </div>
      <p className="label text-ink-mute">{fmtDayShort(s.starts_at)}</p>
      {s.nxtgen_available ? <Pill tone="muted">NXTGEN</Pill> : null}
    </div>
  );
}

/* --- Dgroup ----------------------------------------------------------------- */

export function DgroupCard({ d }: { d: Dgroup }) {
  return (
    <article className="flex h-full flex-col border border-hairline bg-paper-bright p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="clay">{AUDIENCE_LABEL[d.audience]}</Pill>
        <Pill tone="muted">{MODE_LABEL[d.mode]}</Pill>
        {d.language !== "English" ? <Pill tone="muted">{d.language}</Pill> : null}
      </div>

      <h3 className="font-display mt-3 text-xl leading-tight">{d.name}</h3>

      {d.description ? (
        <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-soft">
          {d.description}
        </p>
      ) : null}

      <dl className="mt-4 space-y-1 text-[0.85rem] text-ink-mute">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0">When</dt>
          <dd className="text-ink">
            {dayName(d.day_of_week)}
            {d.start_time ? `, ${to12h(d.start_time)}` : ""}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0">Where</dt>
          <dd className="text-ink">{d.general_area ?? "Shared once you connect"}</dd>
        </div>
        {d.leader_first_name ? (
          <div className="flex gap-2">
            <dt className="w-16 shrink-0">Led by</dt>
            <dd className="text-ink">{d.leader_first_name}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <p className="text-[0.8rem] text-ink-mute">
          {d.seats_left === null
            ? "Open"
            : d.seats_left > 0
              ? `${d.seats_left} spaces left`
              : "Full, join the list"}
        </p>
        <Link
          href={`/grow/find-a-dgroup/${d.id}`}
          className="btn-press label border border-ink px-3.5 py-2 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
        >
          I&rsquo;m interested
        </Link>
      </div>
    </article>
  );
}

function to12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
}

/* --- Facility --------------------------------------------------------------- */

export function FacilityCard({ f }: { f: Facility }) {
  return (
    <Link
      href={`/centris/facilities/${f.slug}`}
      className="group flex h-full flex-col border border-hairline bg-paper-bright hover:border-ink"
    >
      <div className="aspect-[16/10] overflow-hidden">
        <MessageArt
          seed={f.slug}
          label={f.name}
          className="h-full w-full"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl leading-tight group-hover:text-clay">
          {f.name}
        </h3>
        {f.description ? (
          <p className="mt-2 line-clamp-2 text-[0.88rem] leading-relaxed text-ink-soft">
            {f.description}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          {f.capacity ? <Pill tone="muted">{f.capacity} capacity</Pill> : null}
          {f.is_reservable ? <Pill tone="sky">Reservable</Pill> : null}
        </div>
      </div>
    </Link>
  );
}

