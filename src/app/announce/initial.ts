import type { AnnounceInitial } from "./announce-form";
import { manilaDay, manilaMinutesOf } from "@/lib/admin-day";
import type { CcfEvent } from "@/lib/types";

const hhmm = (iso: string) => {
  const m = manilaMinutesOf(iso);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** An event as the announcement form's starting values, for editing. */
export function initialFrom(e: CcfEvent): AnnounceInitial {
  return {
    id: e.id,
    title: e.title,
    ministry: e.ministry ?? undefined,
    category: e.category ?? undefined,
    venue: e.location_note ?? undefined,
    summary: e.summary ?? undefined,
    description: e.description,
    calendarOnly: e.calendar_only,
    dates: (e.dates ?? []).map((d) =>
      d.all_day
        ? { date: manilaDay(d.starts_at), start: "", end: "", allDay: true, until: d.ends_at ? manilaDay(d.ends_at) : "" }
        : { date: manilaDay(d.starts_at), start: hhmm(d.starts_at), end: d.ends_at ? hhmm(d.ends_at) : "" },
    ),
    registrationUrl: e.registration_url,
    feeNote: e.fee_note,
    artwork: e.artwork,
    // A poster is "separate" when it isn't just the Main Hall TV file.
    posterUrl: e.cover_image_url && e.cover_image_url !== e.artwork?.main_tv ? e.cover_image_url : null,
    status: e.status,
  };
}
