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
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  /** The first poster on a page: load it now, not when it scrolls in (2026-10-10). */
  priority?: boolean;
}) {
  const loading = priority ? "eager" : "lazy";
  return (
    <span className={cx("relative block h-full w-full overflow-hidden bg-ink/10", className)}>
      {/* Uploaded artwork; its store's host isn't in next/image's list. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden loading={loading} draggable={false} className="no-frame pointer-events-none absolute inset-0 h-full w-full scale-110 select-none object-cover opacity-60 blur-xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={loading} fetchPriority={priority ? "high" : undefined} draggable={false} className={cx("no-frame pointer-events-none relative h-full w-full select-none object-contain", imgClassName)} />
    </span>
  );
}
