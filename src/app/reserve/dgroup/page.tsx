import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { FloorPlanDrawing } from "@/components/floor-plan";
import {
  bookingOpen,
  DGROUP_OPENS_ON,
  DGROUP_ROOMS,
  DGROUP_SLOTS,
  longDateLabel,
  manilaMinutes,
  MAX_GROUP_SIZE,
  nightLabel,
  nightOptions,
  roomName,
  slotLabel,
  tablesLabel,
} from "@/lib/dgroup-tables";
import { manilaDateKey } from "@/lib/format";
import { currentUser, hasAccounts } from "@/lib/auth/session";
import { getMyContact, getMyDgroupBookings } from "@/lib/queries";
import { BookingForm } from "./booking-form";
import { MyBooking } from "./my-booking";

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
        lead="Pick a day and time, tell us how many are coming, and we'll assign your table."
        image={{
          src: "/photos/dgroup-lounge.jpg",
          alt: "The Dgroup Lounge at CCF Centris, seen through its glass front",
        }}
      />
      <Section>
        <Container className="max-w-3xl">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 border-y border-hairline py-4 text-[0.9rem] text-ink-soft">
            <li>Monday to Friday</li>
            <li>Starts at {SLOT_STARTS}</li>
            <li>Groups up to {MAX_GROUP_SIZE}</li>
            <li>Dgroup Lounge or Welcome Center</li>
          </ul>
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

  const nights = nightOptions(today, manilaMinutes());
  const [contact, mine] = await Promise.all([getMyContact(), getMyDgroupBookings(today)]);

  return (
    <div className="space-y-14">
      {mine.length ? (
        <section aria-labelledby="your-tables-h" id="your-tables" className="scroll-mt-28">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="your-tables-h" className="label text-clay">
              Your upcoming tables
            </h2>
            <Link href="/my/reservations" className="label text-ink-mute underline underline-offset-4 hover:text-ink">
              All my reservations
            </Link>
          </div>
          <ul className="mt-4 space-y-4">
            {mine.map((m) => (
              <MyBooking
                key={m.id}
                id={m.id}
                title={`${tablesLabel(m.table_labels)} · ${roomName(m.room_slug)}`}
                when={`${nightLabel(m.booked_on)}, ${slotLabel(m.slot_id)}`}
                groupSize={m.group_size}
                date={m.booked_on}
                slotId={m.slot_id}
                nights={nights}
                plan={<FloorPlanDrawing room={m.room_slug} highlight={m.table_labels} width={280} />}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="book-h">
        <h2 id="book-h" className="display-md">
          {mine.length ? "Book another slot" : "Book a table"}
        </h2>
        <div className="mt-7">
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
      <h2 id="rooms-h" className="label text-clay">
        The rooms
      </h2>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        {DGROUP_ROOMS.map((r) => (
          <figure key={r.slug} className="border border-hairline bg-paper-bright p-5">
            <figcaption className="font-display text-xl text-ink">{r.name}</figcaption>
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
    <div className="border-l-2 border-clay bg-paper-bright p-6">
      <p className="label text-clay">{label}</p>
      <div className="mt-3 space-y-5 text-[1.02rem] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}
