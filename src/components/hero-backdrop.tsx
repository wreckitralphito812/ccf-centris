/**
 * Still photo backdrop behind the hero.
 *
 * A single full-bleed CCF photograph, washed just enough that the copy card
 * holds against it. No ambient video: the cover photo is a deliberate choice,
 * so nothing is allowed to play over it.
 *
 * Fully inert to assistive tech. It carries no information.
 */
export function HeroBackdrop({
  poster,
  /**
   * Where to hold the crop as the hero changes shape. CSS `object-position`.
   */
  focal = "center 30%",
}: {
  poster: string;
  focal?: string;
}) {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <img
        src={poster}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: focal }}
        loading="eager"
        decoding="async"
      />

      {/* No cover: the photograph carries the hero. Only a soft left-edge
         gradient remains, and just enough of it to seat the copy card —
         it fades out well before the middle of the frame. */}
      <div className="absolute inset-0 bg-gradient-to-r from-paper-deep/55 via-paper-deep/10 to-transparent sm:via-transparent" />
    </div>
  );
}
