import { cx } from "@/components/ui";

/**
 * An uploaded event poster inside a fixed frame (2026-10-08). Ministries send
 * posters in every shape (portrait, square, 16:9), so the poster is shown
 * whole over a blurred copy of itself instead of being cropped to fit. A
 * 16:9 poster fills the frame exactly, as before.
 *
 * The frame (aspect ratio, rounding) comes from the parent; this fills it.
 */
export function PosterImage({ src, alt, className, imgClassName }: { src: string; alt: string; className?: string; imgClassName?: string }) {
  return (
    <span className={cx("relative block h-full w-full overflow-hidden bg-ink/10", className)}>
      {/* Uploaded artwork; its store's host isn't in next/image's list. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden loading="lazy" className="no-frame absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className={cx("no-frame relative h-full w-full object-contain", imgClassName)} />
    </span>
  );
}
