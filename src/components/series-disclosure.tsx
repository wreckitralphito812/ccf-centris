"use client";

import { useState } from "react";
import { cx } from "./ui";
import { PlayGlyph } from "./icons";
import { YouTubeThumb } from "./youtube-thumb";

/** Shape mirrors lib/channel.ts ApiVideo, kept local so this stays a client file. */
export interface SeriesVideo {
  id: string;
  title: string;
  publishedAt: string;
  href: string;
}

export interface SeriesRow {
  slug: string;
  series: string;
  kindLabel: string;
  cover: string;
  coverFallback: string;
  itemCount: number;
  playlistHref: string;
  companions: { label: string; href: string; count: number }[];
  videos: SeriesVideo[];
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={cx(
        "shrink-0 text-ink-mute",
        open && "-scale-y-100",
      )}
      style={{ transition: "scale 160ms ease-out" }}
    >
      <path
        d="m5 8 5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * One teaching series that expands in place to reveal its videos.
 *
 * The videos are rendered on the server and passed in; this component only
 * toggles their visibility. `[hidden]` keeps them in the DOM (and in the page
 * for search) without paying layout while collapsed.
 */
export function SeriesDisclosure({ row }: { row: SeriesRow }) {
  const [open, setOpen] = useState(false);
  const panelId = `series-${row.slug}`;

  return (
    <article className="border border-hairline bg-paper-bright">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5">
        <a
          href={row.playlistHref}
          target="_blank"
          rel="noreferrer"
          className="relative block aspect-video w-full shrink-0 overflow-hidden border border-hairline sm:w-56"
        >
          {row.cover ? (
            <YouTubeThumb
              src={row.cover}
              fallbackSrc={row.coverFallback}
              alt={`${row.series} on YouTube`}
            />
          ) : (
            <span className="halftone block h-full w-full bg-paper-deep" />
          )}
          <span className="label absolute bottom-1.5 right-1.5 bg-night/85 px-2 py-1 text-paper-bright">
            {row.itemCount} videos
          </span>
        </a>

        <div className="min-w-0 flex-1">
          <p className="label text-clay">{row.kindLabel}</p>
          <h3 className="font-display mt-1 text-xl leading-tight">
            {row.series}
          </h3>
          {row.companions.length ? (
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {row.companions.map((c) => (
                <li key={c.href}>
                  <a
                    href={c.href}
                    target="_blank"
                    rel="noreferrer"
                    className="label tap gap-1 border border-ink/20 px-2.5 py-1.5 text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  >
                    {c.label}
                    {c.count ? (
                      <span className="text-ink-mute">{c.count}</span>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="btn-press label tap gap-2 self-start border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright sm:self-center"
        >
          {open ? "Hide videos" : "Show videos"}
          <ChevronIcon open={open} />
        </button>
      </div>

      <div
        id={panelId}
        hidden={!open}
        className="border-t border-hairline bg-paper px-4 py-5 sm:px-5"
      >
        {row.videos.length ? (
          <ol className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {row.videos.map((v, i) => (
              <li key={v.id}>
                <a
                  href={v.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group block"
                >
                  <div className="relative aspect-video overflow-hidden border border-hairline">
                    <YouTubeThumb videoId={v.id} alt={v.title} />
                    <span className="pointer-events-none absolute inset-0 grid place-items-center">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-clay text-paper-bright">
                        <PlayGlyph className="ml-0.5 h-4 w-4" />
                      </span>
                    </span>
                  </div>
                  <p className="label mt-2 text-ink-mute">
                    Part {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="font-display mt-0.5 text-[0.98rem] leading-snug group-hover:text-clay">
                    {v.title}
                  </p>
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[0.9rem] text-ink-mute">
            This series&rsquo; videos open on{" "}
            <a
              href={row.playlistHref}
              target="_blank"
              rel="noreferrer"
              className="link text-clay underline underline-offset-4"
            >
              CCF&rsquo;s YouTube playlist
            </a>
            .
          </p>
        )}
      </div>
    </article>
  );
}
