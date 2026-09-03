"use client";

import { useState } from "react";
import { MessageArt } from "./cards";

/**
 * A photograph sourced from CCF's own YouTube channel (i.ytimg.com thumbnails
 * are hotlinkable and CORS-safe). If the image fails to load — a video was
 * unlisted, the URL rotated — it falls back to the deterministic MessageArt
 * panel so the layout never shows a broken frame.
 *
 * These are CCF's real worship, teaching, and anniversary stills. They stand in
 * until CCF supplies its own photo library for CCF Centris.
 */
export function CcfPhoto({
  src,
  seed,
  label,
  alt,
  className,
}: {
  src: string;
  seed: string;
  label: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <MessageArt seed={seed} label={label} className={className} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={{ objectFit: "cover" }}
    />
  );
}

export { CCF_STILLS, ytThumb } from "@/lib/ccf-stills";
