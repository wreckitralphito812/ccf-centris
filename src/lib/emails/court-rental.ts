import { noticeLayout } from "@/lib/emails/announcement";
import { courtsLabel, dayLabel, FREE_NOTE, peso, sportName, timeRange } from "@/lib/court-rentals";

/**
 * Court rental emails (2026-10-20): to the renter when a rental is booked,
 * moved, or cancelled by the team, and to the team for each new one. Same
 * plain layout as the announcement and Dgroup registry emails.
 */

export interface RentalEmailData {
  origin: string;
  id: string;
  renterName: string;
  sport: string;
  date: string;
  start: number;
  hours: number;
  courtNumbers: number[];
  amount: number;
}

const summary = (d: RentalEmailData) =>
  `${sportName(d.sport)} · ${courtsLabel(d.sport, d.courtNumbers)} · ${dayLabel(d.date)}, ${timeRange(d.start, d.hours)}`;

export type RentalEmailKind = "confirmed" | "moved" | "cancelled";

export function rentalEmail(kind: RentalEmailKind, d: RentalEmailData) {
  const first = d.renterName.split(" ")[0];
  const when = `${dayLabel(d.date)}, ${timeRange(d.start, d.hours)}`;
  const copy = {
    confirmed: {
      subject: `Your Gym rental: ${sportName(d.sport)} · ${dayLabel(d.date)}`,
      headline: `You're booked, ${first}.`,
      paragraphs: [
        `${sportName(d.sport)} in the Gym at CCF Centris: ${courtsLabel(d.sport, d.courtNumbers).toLowerCase()}, ${when}.`,
        // A free rental (amount 0) has no payment to check (2026-11-14).
        d.amount
          ? `You paid ${peso(d.amount)}. The team checks every payment screenshot; if something's wrong with yours, we'll be in touch.`
          : FREE_NOTE,
        "Rentals can't be cancelled, but you can move yours to another open time from your reservations page, even on the day itself.",
      ],
    },
    moved: {
      subject: `Moved: your Gym rental to ${dayLabel(d.date)}`,
      headline: `Your rental is moved, ${first}.`,
      paragraphs: [
        `${sportName(d.sport)} in the Gym: ${courtsLabel(d.sport, d.courtNumbers).toLowerCase()}, ${when}. Your old time is free for someone else.`,
      ],
    },
    cancelled: {
      subject: `Cancelled: your Gym rental on ${dayLabel(d.date)}`,
      headline: `Your rental is cancelled, ${first}.`,
      paragraphs: [
        d.amount
          ? `The CCF Centris team cancelled your ${sportName(d.sport).toLowerCase()} rental on ${when}, usually because the payment couldn't be found.`
          : `The CCF Centris team cancelled your ${sportName(d.sport).toLowerCase()} rental on ${when}.`,
        d.amount
          ? "If you think this is a mistake, reply to this email with your payment details."
          : "If you have questions, reply to this email.",
      ],
    },
  }[kind];
  return {
    subject: copy.subject,
    ...noticeLayout({
      origin: d.origin,
      eyebrow: "Gym rental",
      headline: copy.headline,
      paragraphs: copy.paragraphs,
      button: kind === "cancelled" ? undefined : { label: "See my reservations", href: `${d.origin}/my/reservations` },
    }),
  };
}

/** To the team: a new rental, with a link to its payment screenshot. */
export function adminRentalEmail(d: RentalEmailData & { dgroupName: string | null; mobile: string }) {
  return {
    subject: `New Gym rental: ${sportName(d.sport)} · ${dayLabel(d.date)}`,
    ...noticeLayout({
      origin: d.origin,
      eyebrow: "Gym rental",
      headline: d.amount ? "A court rental is booked. Check the payment." : "A court rental is booked.",
      paragraphs: [
        summary(d),
        `${d.renterName}${d.dgroupName ? ` (${d.dgroupName})` : ""}, ${d.mobile}. ${d.amount ? `Paid ${peso(d.amount)}.` : "Free, no payment."}`,
        d.amount
          ? "It's confirmed already. Open it to see the payment screenshot, and cancel it if the payment isn't there."
          : "It's confirmed already. Open it to see the details, or cancel it if needed.",
      ],
      button: { label: d.amount ? "See the payment" : "See the rental", href: `${d.origin}/admin/courts/${d.id}` },
    }),
  };
}
