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
        className="absolute inset-0 h-full w-full scale-105 object-cover"
        style={{ objectPosition: focal }}
        loading="eager"
        decoding="async"
      />

      {/* Wash. Light enough that the cover photo reads as the photograph it
         is: a whisper of all-over dim for the paper feel, and a left-heavy
         gradient that only has to carry the copy card, fading out well before
         the right half of the frame. */}
      <div className="absolute inset-0 bg-paper-deep/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-paper-deep/85 via-paper-deep/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-paper-deep/35 to-transparent" />
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
