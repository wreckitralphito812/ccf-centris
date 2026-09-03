"use client";

import { useState } from "react";
import { cx } from "./ui";
import { YouTubeThumb } from "./youtube-thumb";
import { YouTubeEmbed } from "./youtube-embed";

/** Kept local so this stays a client file — mirrors channel.ts PlaylistVideo. */
export interface CardVideo {
  id: string;
  title: string;
  publishedAt: string;
}

const dateFmt = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  month: "short",
  day: "numeric",
});

/**
 * A series card: a full-width inline player over a pickable episode list.
 *
 * Idle, it's a thumbnail facade — no request reaches YouTube until the visitor
 * presses play or picks a part. Choosing a part swaps the iframe's `src` to
 * that video. When `videos` is empty (no API key, or quota spent) it falls back
 * to a plain playlist embed so the card still works.
 */
export function SeriesPlayerCard({
  kindLabel,
  series,
  playlistId,
  playlistHref,
  cover,
  coverFallback,
  videos,
}: {
  kindLabel: string;
  series: string;
  playlistId: string;
  playlistHref: string;
  cover: string;
  coverFallback: string;
  videos: CardVideo[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    videos[0]?.id ?? null,
  );
  const [playing, setPlaying] = useState(false);

  const footer = (
    <div className="flex flex-col gap-1 border-t border-hairline p-5">
      <p className="label text-clay">{kindLabel}</p>
      <p className="font-display text-lg leading-tight">{series}</p>
      <p className="mt-0.5 text-[0.82rem] text-ink-soft tabular">
        {videos.length || "—"} {videos.length === 1 ? "part" : "parts"}
        <span className="mx-1.5 text-hairline">·</span>
        <a
          href={playlistHref}
          target="_blank"
          rel="noreferrer"
          className="link text-clay underline underline-offset-4"
        >
          All parts on YouTube →
        </a>
      </p>
    </div>
  );

  // No video list available — fall back to the plain playlist embed.
  if (!videos.length || !selectedId) {
    return (
      <article className="flex flex-col border border-hairline bg-paper-bright">
        <YouTubeEmbed
          playlistId={playlistId}
          title={`${kindLabel} — ${series}`}
          thumbnail={cover}
          thumbnailFallback={coverFallback}
        />
        {footer}
      </article>
    );
  }

  return (
    <article className="flex flex-col border border-hairline bg-paper-bright">
      {playing ? (
        <div className="relative aspect-video overflow-hidden bg-black">
          <iframe
            title={`${series} — ${kindLabel}`}
            src={`https://www.youtube-nocookie.com/embed/${selectedId}?autoplay=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${series}`}
          className="group relative block aspect-video w-full overflow-hidden bg-paper-deep"
        >
          <YouTubeThumb src={cover} fallbackSrc={coverFallback} alt={series} />
          <span className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-clay text-2xl text-paper-bright transition-transform group-hover:scale-110">
              ▶
            </span>
          </span>
        </button>
      )}

      {/* Episode list — ~4 rows at 3.25rem each, then scroll. */}
      <ol className="max-h-52 divide-y divide-hairline overflow-y-auto border-t border-hairline">
        {videos.map((v, i) => {
          const active = v.id === selectedId;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(v.id);
                  setPlaying(true);
                }}
                className={cx(
                  "flex w-full items-baseline gap-3 px-4 py-2.5 text-left transition-colors hover:bg-paper",
                  active && "bg-paper",
                )}
              >
                <span
                  className={cx(
                    "label shrink-0 tabular",
                    active ? "text-clay" : "text-ink-mute",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cx(
                    "min-w-0 flex-1 truncate text-[0.9rem] leading-snug",
                    active ? "font-display text-clay" : "text-ink-soft",
                  )}
                  title={v.title}
                >
                  {v.title}
                </span>
                {v.publishedAt ? (
                  <span className="shrink-0 text-[0.72rem] text-ink-mute tabular">
                    {dateFmt.format(new Date(v.publishedAt))}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      {footer}
    </article>
  );
}
