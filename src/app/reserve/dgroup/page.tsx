import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { FloorPlanDrawing } from "@/components/floor-plan";
import { IconLine } from "@/components/booking";
import {
  bookingOpen,
  DGROUP_OPENS_ON,
  DGROUP_ROOMS,
  DGROUP_SLOTS,
  longDateLabel,
  manilaMinutes,
  MAX_GROUP_SIZE,
  nightOptions,
  withAvailability,
} from "@/lib/dgroup-tables";
import { manilaDateKey } from "@/lib/format";
import { currentUser, hasAccounts } from "@/lib/auth/session";
import { getDgroupHolds, getMyContact, getMyDgroupBookings } from "@/lib/queries";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: "Reserve a Dgroup table",
  description:
    "Book a table for your Dgroup in the Dgroup Lounge or the Welcome Center at CCF Centris, Monday to Friday.",
};

/** See bookingPreview() in the actions: pre-launch testing, never production. */
const preview = () =>
  process.env.DGROUP_BOOKING_PREVIEW === "1" && process.env.VERCEL_ENV !== "production";

/** "1:00, 4:00 or 7:00 PM", from the slot labels ("1:00 – 3:30 PM"). */
const SLOT_STARTS = (() => {
  const starts = DGROUP_SLOTS.map((s) => s.label.split(" – ")[0]);
  const suffix = DGROUP_SLOTS.at(-1)?.label.slice(-2) ?? "";
  const list =
    starts.length > 1 ? `${starts.slice(0, -1).join(", ")} or ${starts.at(-1)}` : (starts[0] ?? "");
  return `${list} ${suffix}`;
})();

export default function DgroupTablesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Reserve · Dgroup meeting"
        title="Book a table for your Dgroup."
        lead="Four quick questions. We'll pick the table."
      />
      <Section tone="mist">
        <Container className="max-w-2xl">
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <IconLine icon="calendar">Monday to Friday</IconLine>
            <IconLine icon="clock">Starts at {SLOT_STARTS}</IconLine>
            <IconLine icon="people">Groups up to {MAX_GROUP_SIZE}</IconLine>
            <IconLine icon="pin">Dgroup Lounge or Welcome Center</IconLine>
          </div>
          <div className="mt-10">
            <Booking />
          </div>
        </Container>
      </Section>
    </>
  );
}

async function Booking() {
  // Always render per visitor: this section shows members their own data.
  await connection();
  const today = manilaDateKey();

  if (!bookingOpen(today, preview())) {
    return (
      <div className="space-y-10">
        <Notice label={`Opens ${longDateLabel(DGROUP_OPENS_ON)}`}>
          <p>
            Dgroup table reservations open on {longDateLabel(DGROUP_OPENS_ON)}, 2026, for
            Dgroups meeting from Monday, October 5. Come back then to book.
          </p>
        </Notice>
        <Rooms />
      </div>
    );
  }

  if (!hasAccounts()) {
    return (
      <Notice label="Opening soon">
        <p>Table reservations open when member accounts go live.</p>
      </Notice>
    );
  }

  const user = await currentUser();
  if (!user) {
    return (
      <div className="space-y-10">
        <Notice label="Sign in to book">
          <p>
            Sign in with your email so you can change or cancel your bookings later. We send you
            a link; there&rsquo;s no password.
          </p>
          <ButtonLink href="/sign-in?next=/reserve/dgroup">Sign in to book a table</ButtonLink>
        </Notice>
        <Rooms />
      </div>
    );
  }

  const open = nightOptions(today, manilaMinutes());
  const [contact, mine, holds] = await Promise.all([
    getMyContact(),
    getMyDgroupBookings(today),
    getDgroupHolds(open.map((n) => n.date)),
  ]);
  // Without the holds the form still books; it just can't show what's left.
  const nights = holds ? withAvailability(open, holds) : open;

  return (
    <div className="space-y-8">
      {mine.length ? (
        <Link
          href="/my/reservations"
          className="calm-card flex items-center justify-between gap-4 px-7 py-5 transition-shadow hover:shadow-lg"
        >
          <span className="text-[1rem] text-ink">
            You have <span className="font-semibold">{mine.length} upcoming {mine.length === 1 ? "table" : "tables"}</span>.
          </span>
          <span className="shrink-0 text-[0.98rem] font-semibold text-clay">See them</span>
        </Link>
      ) : null}

      <section aria-labelledby="book-h">
        <h2 id="book-h" className="sr-only">
          Book a table
        </h2>
        <div>
          <BookingForm
            nights={nights}
            email={contact?.email || user.email}
            name={contact?.name ?? ""}
            mobile={contact?.mobile ?? ""}
          />
        </div>
      </section>
    </div>
  );
}

/** Both rooms with every table numbered, so leaders know the space. */
function Rooms() {
  return (
    <section aria-labelledby="rooms-h">
      <h2 id="rooms-h" className="text-[1.2rem] font-semibold text-ink">
        The rooms
      </h2>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        {DGROUP_ROOMS.map((r) => (
          <figure key={r.slug} className="calm-card p-6">
            <figcaption className="text-[1.2rem] font-semibold text-ink">{r.name}</figcaption>
            <p className="mt-1 text-[0.85rem] text-ink-mute">
              {r.tables.length} tables · {r.tables.reduce((n, t) => n + t.seats, 0)} seats
            </p>
            <div className="mt-4 overflow-hidden">
              <FloorPlanDrawing room={r.slug} highlight={[]} width={260} />
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Notice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="calm-card p-7 sm:p-9">
      <p className="text-[1.2rem] font-semibold text-ink">{label}</p>
      <div className="mt-3 space-y-5 text-[1.02rem] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}
