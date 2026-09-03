"use client";

import { useState } from "react";
import { YouTubeThumb } from "./youtube-thumb";
import { cx } from "./ui";

/**
 * A YouTube player that costs nothing until someone wants it.
 *
 * The thumbnail stands in for the player until it is clicked, then the iframe
 * replaces it and starts. Mounting a real iframe for every video on a page
 * would pull in YouTube's player bundle several times over on first paint, so
 * the facade keeps the page fast and avoids handing YouTube a request from
 * visitors who never press play.
 *
 * Scheduled streams embed the same way: YouTube renders its own countdown in
 * the iframe and switches to the live feed when the service starts, with no
 * change needed here.
 */
export function YouTubeEmbed({
  videoId,
  playlistId,
  title,
  thumbnail,
  thumbnailFallback,
  className,
  loading = "lazy",
}: {
  /** A single video. Omit when embedding a whole playlist. */
  videoId?: string;
  /** A playlist — plays in sequence, starting at the first item. */
  playlistId?: string;
  title: string;
  thumbnail?: string;
  thumbnailFallback?: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [playing, setPlaying] = useState(false);

  const src = playlistId
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${playlistId}&autoplay=1&rel=0`
    : `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;

  if (playing) {
    return (
      <div className={cx("relative aspect-video overflow-hidden bg-black", className)}>
        <iframe
          title={title}
          src={src}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play ${title}`}
      className={cx(
        "group relative block aspect-video w-full overflow-hidden bg-paper-deep",
        className,
      )}
    >
      <YouTubeThumb
        videoId={videoId}
        src={thumbnail}
        fallbackSrc={thumbnailFallback}
        alt={title}
        loading={loading}
      />
      <span className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-clay text-2xl text-paper-bright transition-transform group-hover:scale-110">
          ▶
        </span>
      </span>
    </button>
  );
}
