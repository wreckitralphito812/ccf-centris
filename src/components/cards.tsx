import Link from "next/link";
import type { CcfEvent, Community, Dgroup, Facility, Message, Service, VolunteerRole } from "@/lib/types";
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
    ["#00a6b6", "#f4efe6"],
    ["#72042c", "#ebe3d5"],
    ["#10262b", "#00a6b6"],
    ["#007682", "#e8dcc6"],
    ["#4a5d3a", "#f4efe6"],
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

/* --- Community -------------------------------------------------------------- */

/**
 * Per-community accent. Two brand families only — teal and maroon — used as a
 * thin top bar and the icon, not a full fill, so the card stays light and the
 * eight cards read as one calm set rather than a patchwork of color blocks.
 */
const ACCENT: Record<string, { bar: string; ink: string; chip: string }> = {
  clay: { bar: "#00a6b6", ink: "#005f68", chip: "#e0f3f4" },
  sky: { bar: "#7d1235", ink: "#7d1235", chip: "#f7e6ec" },
  moss: { bar: "#00a6b6", ink: "#005f68", chip: "#e0f3f4" }, // legacy → teal
  night: { bar: "#00a6b6", ink: "#005f68", chip: "#e0f3f4" }, // legacy → teal
};

export function CommunityCard({ c }: { c: Community }) {
  const accent = ACCENT[c.accent ?? "clay"] ?? ACCENT.clay;
  return (
    <Link
      href={`/communities/${c.slug}`}
      className="group relative grid grid-rows-[auto_1fr_auto] overflow-hidden rounded-xl border border-hairline bg-paper-bright shadow-[0_1px_2px_rgba(32,26,18,0.04)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-24px_rgba(32,26,18,0.35)]"
    >
      {/* Top accent bar — grows on hover. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px] origin-left transition-transform duration-200 group-hover:scale-y-[2]"
        style={{ background: accent.bar }}
      />

      {/* Row 1 — icon + life-stage, fixed height so every card's title starts
          on the same line. */}
      <div className="flex items-start justify-between gap-3 px-5 pt-6">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
          style={{ background: accent.chip, color: accent.ink }}
        >
          <CommunityIcon slug={c.slug} />
        </span>
        {c.life_stage ? (
          <span className="label mt-1 rounded-full bg-ink/5 px-2.5 py-1 text-ink-mute">
            {c.life_stage}
          </span>
        ) : null}
      </div>

      {/* Row 2 — name (1 line) + tagline (2-line box, always reserved). */}
      <div className="px-5 pt-4">
        <h3 className="font-display truncate text-2xl leading-tight text-ink">
          {c.name}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-[2.75em] text-[0.9rem] leading-snug text-ink-soft">
          {c.tagline ?? ""}
        </p>
      </div>

      {/* Row 3 — schedule, pinned to a fixed-height footer so every card's
          divider and note align across the grid. */}
      <div className="mt-4 flex items-start gap-2.5 border-t border-hairline px-5 py-4">
        <ClockGlyph className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-mute" />
        <p className="line-clamp-2 min-h-[2.4em] text-[0.8rem] leading-snug text-ink-mute">
          {c.meeting_note ?? "Schedule varies — see the community page"}
        </p>
        <span
          aria-hidden
          className="ml-auto translate-x-1 self-center text-lg opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100"
          style={{ color: accent.ink }}
        >
          →
        </span>
      </div>
    </Link>
  );
}

function ClockGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/**
 * One line icon per community, keyed by slug so the mapping survives a name
 * change. Falls back to a people glyph for anything unmapped.
 */
function CommunityIcon({ slug }: { slug: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (slug) {
    case "nxtgen": // kite — children
      return (
        <svg {...common}>
          <path d="M12 3 4 11l8 8 8-8-8-8Z" />
          <path d="M12 3v16M4 11h16" />
          <path d="M12 19v3" />
        </svg>
      );
    case "elevate": // upward chevrons — students
      return (
        <svg {...common}>
          <path d="m6 15 6-6 6 6" />
          <path d="m6 9 6-6 6 6" />
        </svg>
      );
    case "b1g": // compass — purpose
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
        </svg>
      );
    case "families": // house with heart — family discipleship
      return (
        <svg {...common}>
          <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8Z" />
          <path d="M12 17.5c-1.6-1.2-3-2.3-3-3.7a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 1.4-1.4 2.5-3 3.7Z" />
        </svg>
      );
    case "women": // sprout — transforming love
      return (
        <svg {...common}>
          <path d="M12 21v-8" />
          <path d="M12 13c0-3-2-5-6-5 0 3 2 6 6 5Z" />
          <path d="M12 11c0-3 2-5 6-5 0 3-2 6-6 5Z" />
        </svg>
      );
    case "men": // anvil / shield — biblical manhood
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
        </svg>
      );
    case "ignite": // briefcase — business
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="1.5" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="M3 12h18" />
        </svg>
      );
    case "sports": // ball in motion
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4a8 8 0 0 0 0 16M4 12a8 8 0 0 0 16 0" />
        </svg>
      );
    default: // people
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="10" r="2.4" />
          <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S13.9 16 14.5 19" />
          <path d="M15 14.6c2 .2 3.6 1.5 4 4" />
        </svg>
      );
  }
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
          I'm interested
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

/* --- Volunteer -------------------------------------------------------------- */

export function VolunteerCard({ r }: { r: VolunteerRole }) {
  return (
    <Link
      href={`/serve/${r.slug}`}
      className="group flex h-full flex-col border border-hairline bg-paper-bright p-5 hover:border-ink"
    >
      {r.ministry ? <p className="label text-clay">{r.ministry}</p> : null}
      <h3 className="font-display mt-2 text-xl leading-tight group-hover:text-clay">
        {r.title}
      </h3>
      {r.description ? (
        <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-soft">
          {r.description}
        </p>
      ) : null}
      {r.commitment ? (
        <p className="mt-auto pt-4 text-[0.8rem] text-ink-mute">{r.commitment}</p>
      ) : null}
    </Link>
  );
}
