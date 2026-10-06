import { dateText, downloadName, PLACEMENTS, type PlacementKey } from "@/lib/announcements";
import { manilaDay } from "@/lib/admin-day";
import type { CcfEvent } from "@/lib/types";

/* The pieces of the announcements queue (2026-10-05): the review card and
   the screen files, shared by the admin page and its preview. */

export const when = (e: CcfEvent) =>
  (e.dates ?? [{ starts_at: e.starts_at, ends_at: e.ends_at }])
    .map((d) => dateText(d))
    .join(" · ");

/** Every file, with its placement and a download link named for the media team. */
export function Files({ e }: { e: CcfEvent }) {
  const date = manilaDay(e.starts_at);
  return (
    <ul className="flex flex-wrap gap-2">
      {PLACEMENTS.map((p) => {
        const url = e.artwork?.[p.key];
        return (
          <li key={p.key}>
            {url ? (
              <a
                href={`${url}?download=1`}
                download={downloadName(e.title, date, p.key as PlacementKey, url)}
                title={downloadName(e.title, date, p.key as PlacementKey, url)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-edge bg-paper-bright px-3 text-[0.85rem] font-semibold text-clay hover:border-clay"
              >
                ↓ {p.label}
              </a>
            ) : (
              <span className="inline-flex min-h-9 items-center rounded-lg border border-dashed border-edge px-3 text-[0.85rem] text-ink-mute">
                No {p.label}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** One announcement as the reviewer sees it: the card, the facts, the files. */
export function Review({ e, children }: { e: CcfEvent; children?: React.ReactNode }) {
  return (
    <article className="grid gap-5 p-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <div>
        <div className="aspect-video overflow-hidden rounded-lg bg-mist">
          {e.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.cover_image_url} alt={`${e.title} artwork`} className="h-full w-full object-cover" />
          ) : null}
        </div>
        {e.artwork?.social ? (
          <a href={e.artwork.social} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[0.85rem] font-semibold text-clay">
            Phone version →
          </a>
        ) : null}
      </div>
      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-[0.85rem] font-semibold text-clay">
            {e.category} · {e.ministry}
          </p>
          <h3 className="text-[1.2rem] font-bold leading-snug text-ink">{e.title}</h3>
          <p className="mt-1 text-[0.95rem] leading-relaxed text-ink-soft">{e.summary}</p>
        </div>
        <dl className="grid gap-x-4 gap-y-1 text-[0.92rem] sm:grid-cols-[7rem_minmax(0,1fr)]">
          <dt className="text-ink-mute">When</dt>
          <dd className="text-ink">{when(e)}</dd>
          <dt className="text-ink-mute">Where</dt>
          <dd className="text-ink">{e.location_note}</dd>
          <dt className="text-ink-mute">Sign-up</dt>
          <dd className="truncate text-ink">
            {e.registration_url ? (
              <a href={e.registration_url} target="_blank" rel="noreferrer" className="text-clay underline underline-offset-2">
                {e.registration_url}
              </a>
            ) : (
              "No sign-up needed"
            )}
          </dd>
          <dt className="text-ink-mute">Fee</dt>
          <dd className="text-ink">{e.fee_note ?? "Free"}</dd>
        </dl>
        <Files e={e} />
        {children}
      </div>
    </article>
  );
}

