"use client";

import { useState } from "react";
import { cx } from "./ui";

/**
 * A YouTube thumbnail at max resolution (1280x720), falling back to the
 * always-present hqdefault (480x360) if maxresdefault 404s — which happens for
 * some older uploads and most scheduled-but-unstarted streams.
 *
 * Pass `videoId` and it builds both URLs; or pass an explicit `src` plus
 * `fallbackSrc`.
 */
export function YouTubeThumb({
  videoId,
  src,
  fallbackSrc,
  alt,
  className,
  loading = "lazy",
}: {
  videoId?: string;
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const primary =
    src ?? (videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : "");
  const backup =
    fallbackSrc ??
    (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");

  const [current, setCurrent] = useState(primary);

  // YouTube answers a missing maxresdefault with a 404 that still carries a
  // 120x90 grey placeholder, so the browser often "loads" it rather than
  // erroring. And on a server-rendered page the image can finish before React
  // attaches onError at all. So check both ways: on load, and when the element
  // mounts already complete.
  const fallBack = (img: HTMLImageElement | null) => {
    if (!img || !img.complete || !backup || current === backup) return;
    if (img.naturalWidth === 0 || img.naturalWidth <= 120) setCurrent(backup);
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={fallBack}
      src={current}
      alt={alt}
      loading={loading}
      decoding="async"
      onLoad={(e) => fallBack(e.currentTarget)}
      onError={() => {
        if (backup && current !== backup) setCurrent(backup);
      }}
      className={cx("h-full w-full object-cover", className)}
    />
  );
}
