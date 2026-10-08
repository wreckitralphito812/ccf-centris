import Link from "next/link";
import { MessageArt } from "@/components/cards";
import { PosterImage } from "@/components/poster-image";
import { cx } from "@/components/ui";
import { shortWhen } from "@/lib/announcements";
import type { CcfEvent } from "@/lib/types";

/**
 * A 16:9 event poster with its date and title under it. Uses the uploaded
 * poster when the event has one. Otherwise CCF-coloured placeholder art
 * carries the event's title, as a real poster would; a category name there
 * repeated down a whole row ("Sports, Sports").
 */
export function PosterCard({ e, dark }: { e: CcfEvent; dark?: boolean }) {
  return (
    <Link href={`/events/${e.slug}`} className="group block">
      <div className="relative aspect-video overflow-hidden bg-ink/10">
        {e.cover_image_url ? (
          <PosterImage
            src={e.cover_image_url}
            alt={`${e.title} poster`}
            imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <MessageArt
            seed={e.slug}
            label={e.title}
            className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
      </div>
      <p className={cx("label mt-3", dark ? "text-paper-bright/80" : "text-clay")}>
        {shortWhen(e)}
      </p>
      <h3
        className={cx(
          "font-display mt-1.5 text-xl leading-snug",
          dark ? "text-paper-bright" : "text-ink group-hover:text-clay",
        )}
      >
        {e.title}
      </h3>
      {e.location_note ? (
        <p className={cx("mt-1 text-[0.88rem]", dark ? "text-paper-bright/75" : "text-ink-mute")}>
          {e.location_note}
        </p>
      ) : null}
    </Link>
  );
}
