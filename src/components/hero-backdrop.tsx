"use client";

import { useEffect, useRef, useState } from "react";
import type { ChannelVideo } from "@/lib/youtube";

/**
 * Ambient background reel behind the hero.
 *
 * Plays CCF's most recent uploads muted and looping, cycling to the next clip
 * on an interval so the page stays current as the channel does. Deliberately
 * restrained:
 *
 *  - Never autoplays for anyone who asked for reduced motion. They get the
 *    still thumbnail, which is already the right image.
 *  - Never loads the iframe on small screens or slow connections, where a
 *    background video is a data cost with no benefit.
 *  - Starts from the poster image, so first paint is instant and the video
 *    fades in only once it is actually ready.
 *  - Fully inert to assistive tech. It carries no information.
 */
export function HeroBackdrop({ videos }: { videos: ChannelVideo[] }) {
  const [index, setIndex] = useState(0);
  const [play, setPlay] = useState(false);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Decide once, on mount, whether ambient video is appropriate at all.
  useEffect(() => {
    if (!videos.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches;

    // navigator.connection is Chromium-only; absent elsewhere, which is fine.
    const conn = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    const thrifty =
      conn?.saveData === true ||
      (conn?.effectiveType ? /2g/.test(conn.effectiveType) : false);

    if (reduced || small || thrifty) return;

    // Let the hero text paint before we ask for a video.
    const id = setTimeout(() => setPlay(true), 900);
    return () => clearTimeout(id);
  }, [videos.length]);

  // Advance through the reel while playing.
  useEffect(() => {
    if (!play || videos.length < 2) return;
    timer.current = setTimeout(() => {
      setReady(false);
      setIndex((i) => (i + 1) % videos.length);
    }, 42_000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [play, index, videos.length]);

  if (!videos.length) return null;
  const current = videos[index];

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      {/* Poster. Always present, so there is never an empty frame. */}
      <img
        src={current.thumbnail}
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover"
        loading="eager"
        decoding="async"
      />

      {play ? (
        <iframe
          key={current.id}
          title=""
          tabIndex={-1}
          onLoad={() => setReady(true)}
          src={
            `https://www.youtube-nocookie.com/embed/${current.id}` +
            `?autoplay=1&mute=1&controls=0&loop=1&playlist=${current.id}` +
            `&playsinline=1&modestbranding=1&rel=0&disablekb=1&fs=0&iv_load_policy=3&start=12`
          }
          allow="autoplay; encrypted-media"
          className={[
            "pointer-events-none absolute left-1/2 top-1/2",
            // 16:9 sized to always cover, however the hero is shaped.
            "h-[56.25vw] min-h-full w-[177.77vh] min-w-full",
            "-translate-x-1/2 -translate-y-1/2",
            "transition-opacity duration-1000",
            ready ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      ) : null}

      {/* Wash. Keeps the paper feel and guarantees text contrast over any frame. */}
      <div className="absolute inset-0 bg-paper-deep/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-paper-deep via-paper-deep/85 to-paper-deep/55" />
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage: "radial-gradient(#17150f 1px, transparent 1.2px)",
          backgroundSize: "8px 8px",
        }}
      />
    </div>
  );
}
