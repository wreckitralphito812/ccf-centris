"use client";

import { useState } from "react";
import { cx } from "./ui";
import { PlayGlyph } from "./icons";

/**
 * "Welcome to CCF" intro film, served from Vercel Blob storage as a
 * self-hosted MP4 (no YouTube chrome, no third-party request on first
 * paint). Lives in Blob rather than /public so the ~28MB file isn't
 * re-uploaded on every deploy.
 *
 * Costs nothing until pressed: the poster image stands in for the player,
 * and only on click does the real <video> mount and start. 16:9 and fluid,
 * so it fits any viewport — full width on mobile, capped by its container
 * on desktop.
 */
export function WelcomeVideo({
  src = "https://zqrweqhvvyijaafm.public.blob.vercel-storage.com/welcome-to-ccf-rjCT1yIipTVRreMsWzMb4m3XTS5ylb.mp4",
  poster = "https://zqrweqhvvyijaafm.public.blob.vercel-storage.com/welcome-to-ccf-poster.jpg",
  className,
}: {
  src?: string;
  poster?: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div
        className={cx(
          "relative aspect-video w-full overflow-hidden bg-black",
          className,
        )}
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label="Play the Welcome to CCF video"
      className={cx(
        "group relative block aspect-video w-full overflow-hidden bg-night",
        className,
      )}
    >
      <img
        src={poster}
        alt=""
        className="no-frame h-full w-full object-cover"
        loading="lazy"
      />
      <span className="pointer-events-none absolute inset-0 grid place-items-center bg-night/20 transition-colors group-hover:bg-night/10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-clay text-paper-bright shadow-lg transition-transform group-hover:scale-110">
          <PlayGlyph className="ml-0.5 h-7 w-7" />
        </span>
      </span>
      <span className="label pointer-events-none absolute bottom-3 left-3 bg-night/80 px-2.5 py-1 text-paper-bright">
        Introduction · 2 min
      </span>
    </button>
  );
}
