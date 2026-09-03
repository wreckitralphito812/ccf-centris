"use client";

import { useEffect, useRef, useState } from "react";
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
  year: "numeric",
});

interface Props {
  kindLabel: string;
  series: string;
  playlistId: string;
  playlistHref: string;
  cover: string;
  coverFallback: string;
  videos: CardVideo[];
}

/**
 * A series card that opens a full-screen theatre on click: a large player with
 * the episode list running down the side, so a visitor can pick any part
 * without leaving the page. Escape or the close button returns to the page.
 *
 * The card itself makes no request to YouTube — the thumbnail is a facade, and
 * the player only mounts once the theatre is open. When `videos` is empty (no
 * API key, or quota spent) the card falls back to the inline playlist embed.
 */
export function SeriesPlayerCard(props: Props) {
  const { kindLabel, series, playlistId, playlistHref, cover, coverFallback, videos } =
    props;
  const [open, setOpen] = useState(false);

  const footer = (
    <div className="flex flex-1 flex-col p-5">
      <p className="label text-clay">{kindLabel}</p>
      <p className="font-display mt-1.5 text-lg leading-tight">{series}</p>
      <p className="mt-1.5 text-[0.82rem] text-ink-soft tabular">
        {videos.length || "—"} {videos.length === 1 ? "part" : "parts"}
      </p>
    </div>
  );

  // No video list — fall back to the plain inline playlist embed.
  if (!videos.length) {
    return (
      <article className="flex flex-col border border-hairline bg-paper-bright">
        <div className="border-b border-hairline">
          <YouTubeEmbed
            playlistId={playlistId}
            title={`${kindLabel} — ${series}`}
            thumbnail={cover}
            thumbnailFallback={coverFallback}
          />
        </div>
        {footer}
      </article>
    );
  }

  return (
    <>
      <article className="flex flex-col border border-hairline bg-paper-bright">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Watch ${series} — ${videos.length} parts`}
          className="group relative block aspect-video w-full overflow-hidden border-b border-hairline bg-paper-deep"
        >
          <YouTubeThumb src={cover} fallbackSrc={coverFallback} alt={series} />
          <span className="pointer-events-none absolute inset-0 grid place-items-center bg-night/0 transition-colors group-hover:bg-night/20">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-clay text-2xl text-paper-bright transition-transform group-hover:scale-110">
              ▶
            </span>
          </span>
          <span className="label absolute bottom-2 right-2 bg-night/85 px-2 py-1 text-paper-bright">
            {videos.length} parts
          </span>
        </button>
        {footer}
      </article>

      {open ? (
        <SeriesTheatre {...props} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function SeriesTheatre({
  kindLabel,
  series,
  playlistHref,
  videos,
  onClose,
}: Props & { onClose: () => void }) {
  const [selectedId, setSelectedId] = useState(videos[0].id);
  const [showHint, setShowHint] = useState(true);
  const selectedIndex = Math.max(
    0,
    videos.findIndex((v) => v.id === selectedId),
  );
  const activeRef = useRef<HTMLLIElement | null>(null);

  const go = (i: number) => {
    const clamped = Math.min(Math.max(i, 0), videos.length - 1);
    setSelectedId(videos[clamped].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Keep the playing row in view when it changes via prev/next.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${series} — ${kindLabel}`}
      className="fixed inset-0 z-60 flex items-stretch justify-center bg-ink/55 backdrop-blur-sm sm:p-4 md:p-6"
    >
      <div className="flex w-full max-w-6xl flex-col overflow-hidden border border-hairline bg-paper-bright shadow-[0_40px_120px_-30px_rgba(23,21,15,0.55)] sm:rounded-lg">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-hairline bg-paper px-4 py-3.5 sm:px-6">
          <div className="min-w-0">
            <p className="label text-clay">{kindLabel}</p>
            <h2 className="truncate font-display text-lg leading-tight text-ink">
              {series}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="btn-press inline-flex shrink-0 items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-[0.8rem] font-semibold text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            <span aria-hidden className="text-base leading-none">
              ✕
            </span>
            Close
          </button>
        </header>

        {/* Body: player stage + episode rail */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Stage — the 16:9 box is capped by height as well as width so it
              never bleeds under the rail or past the viewport. */}
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-bone/60 p-4 sm:p-6">
            <div className="relative aspect-video w-full max-w-[min(100%,calc((100vh-15rem)*1.7778))] overflow-hidden rounded-md bg-black shadow-[0_24px_60px_-24px_rgba(23,21,15,0.5)] ring-1 ring-ink/10">
              <iframe
                key={selectedId}
                title={`${series} — part ${selectedIndex + 1}`}
                src={`https://www.youtube-nocookie.com/embed/${selectedId}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            {/* Prev / now / next — a plain control the visitor recognizes. */}
            <div className="flex w-full max-w-[min(100%,calc((100vh-15rem)*1.7778))] items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => go(selectedIndex - 1)}
                disabled={selectedIndex === 0}
                className="btn-press label inline-flex items-center gap-1.5 text-ink-soft transition-colors hover:text-clay disabled:pointer-events-none disabled:opacity-30"
              >
                ← Prev
              </button>
              <p className="min-w-0 truncate text-center text-[0.82rem] text-ink-mute tabular">
                Part {selectedIndex + 1} of {videos.length}
              </p>
              <button
                type="button"
                onClick={() => go(selectedIndex + 1)}
                disabled={selectedIndex === videos.length - 1}
                className="btn-press label inline-flex items-center gap-1.5 text-ink-soft transition-colors hover:text-clay disabled:pointer-events-none disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Episode rail */}
          <aside className="flex min-h-0 shrink-0 flex-col border-t border-hairline bg-paper-bright lg:h-full lg:w-88 lg:border-l lg:border-t-0 xl:w-96">
            <div className="flex shrink-0 items-baseline justify-between gap-3 border-b border-hairline px-4 py-3">
              <p className="label text-ink-mute">Episodes · {videos.length}</p>
              <a
                href={playlistHref}
                target="_blank"
                rel="noreferrer"
                className="link label text-clay underline underline-offset-4"
              >
                On YouTube →
              </a>
            </div>

            {showHint ? (
              <div className="flex shrink-0 items-start gap-2 border-b border-hairline bg-clay/8 px-4 py-2.5 text-[0.78rem] leading-snug text-ink-soft">
                <span aria-hidden className="mt-px text-clay">
                  ⓘ
                </span>
                <span className="flex-1">
                  Pick any part to jump straight to it. Press{" "}
                  <kbd className="rounded border border-ink/20 bg-paper px-1 text-[0.7rem] tabular">
                    Esc
                  </kbd>{" "}
                  to close.
                </span>
                <button
                  type="button"
                  onClick={() => setShowHint(false)}
                  aria-label="Dismiss tip"
                  className="shrink-0 text-ink-mute transition-colors hover:text-ink"
                >
                  ✕
                </button>
              </div>
            ) : null}

            <ol className="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto">
              {videos.map((v, i) => {
                const active = v.id === selectedId;
                return (
                  <li key={v.id} ref={active ? activeRef : null}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(v.id)}
                      aria-current={active ? "true" : undefined}
                      className={cx(
                        "group flex w-full gap-3 border-l-2 px-4 py-3 text-left transition-colors",
                        active
                          ? "border-clay bg-clay/8"
                          : "border-transparent hover:bg-paper",
                      )}
                    >
                      <span
                        className={cx(
                          "label flex w-6 shrink-0 justify-center pt-0.5 tabular",
                          active ? "text-clay" : "text-ink-mute",
                        )}
                      >
                        {active ? (
                          <span aria-hidden className="text-[0.6rem]">
                            ▶
                          </span>
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cx(
                            "block text-[0.88rem] leading-snug",
                            active
                              ? "font-display text-ink"
                              : "text-ink-soft group-hover:text-ink",
                          )}
                        >
                          {v.title}
                        </span>
                        {v.publishedAt ? (
                          <span className="mt-0.5 block text-[0.7rem] text-ink-mute tabular">
                            {dateFmt.format(new Date(v.publishedAt))}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </aside>
        </div>
      </div>
    </div>
  );
}
