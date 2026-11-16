import { getImageProps } from "next/image";
import { cx } from "@/components/ui";

/**
 * An uploaded event poster inside a fixed frame (2026-10-08). Ministries send
 * posters in every shape (portrait, square, 16:9), so the poster is shown
 * whole over a blurred copy of itself instead of being cropped to fit. A
 * 16:9 poster fills the frame exactly, as before.
 *
 * The frame (aspect ratio, rounding) comes from the parent; this fills it.
 * The pictures can't be dragged and let clicks through to what's around them
 * (a link, or the admin's "change poster" control): in some browsers a click
 * on a draggable picture started a drag instead, so nothing happened
 * (2026-10-08).
 */
export function PosterImage({
  src,
  alt,
  className,
  imgClassName,
  priority,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** The first poster on a page: load it now, not when it scrolls in (2026-10-10). */
  priority?: boolean;
  /** How wide the frame is on screen, as for <img sizes>, when it isn't a card. */
  sizes?: string;
}) {
  const loading = priority ? "eager" : "lazy";
  const sharp = optimized(src, sizes ?? DEFAULT_SIZES, 1600, alt);
  // The blurred backdrop never needs detail: a 64px copy is plenty.
  const soft = optimized(src, "64px", 64, "");
  return (
    <span className={cx("relative block h-full w-full overflow-hidden bg-ink/10", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...soft} alt="" aria-hidden loading={loading} draggable={false} className="no-frame pointer-events-none absolute inset-0 h-full w-full scale-110 select-none object-cover opacity-60 blur-xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img {...sharp} alt={alt} loading={loading} fetchPriority={priority ? "high" : undefined} draggable={false} className={cx("no-frame pointer-events-none relative h-full w-full select-none object-contain", imgClassName)} />
    </span>
  );
}

/** A card or rail poster: about a third of the page on wide screens, full width on phones. */
const DEFAULT_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";

/**
 * Posters on Vercel Blob go through Next's image optimizer (2026-11-16): a
 * phone gets a WebP sized to its screen instead of the full upload (often a
 * multi-megabyte PNG). Any other address is used as it is, since the
 * optimizer only serves hosts listed in next.config.ts.
 */
function optimized(src: string, sizes: string, width: number, alt: string): { src: string; srcSet?: string; sizes?: string } {
  let host = "";
  try {
    host = new URL(src).hostname;
  } catch {
    return { src };
  }
  if (!host.endsWith(".public.blob.vercel-storage.com")) return { src };
  const { props } = getImageProps({ src, alt, width, height: Math.round((width * 9) / 16), sizes, quality: 75 });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}
