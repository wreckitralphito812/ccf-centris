import { connection } from "next/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { FloorPlanDrawing, floorPlanWidthForHeight } from "@/components/floor-plan";
import {
  bookableNights,
  bookingOpen,
  DGROUP_OPENS_ON,
  DGROUP_POLICIES,
  DGROUP_ROOMS,
  DGROUP_SLOTS,
  longDateLabel,
  manilaMinutes,
  nightLabel,
  openSlots,
  roomName,
  slotLabel,
  tablesLabel,
} from "@/lib/dgroup-tables";
import { manilaDateKey } from "@/lib/format";
import { hasSupabase, SATELLITE_ID } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/ssr";
import { BookingForm, type NightOption } from "./booking-form";
import { MyBooking } from "./my-booking";

export const metadata: Metadata = {
  title: "Reserve a Dgroup table",
  description:
    "Book a table for your Dgroup in the Dgroup Lounge or the Welcome Center at CCF Centris, Monday to Friday.",
};

interface Row {
  id: string;
  room_slug: string;
  table_labels: string[];
  booked_on: string;
  slot_id: string;
  group_size: number;
}

/** See bookingPreview() in the actions: pre-launch testing, never production. */
const preview = () =>
  process.env.DGROUP_BOOKING_PREVIEW === "1" && process.env.VERCEL_ENV !== "production";

export default function DgroupTablesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Reserve · Dgroup meeting"
        title="Book a table for your Dgroup."
        lead="Monday to Friday in the Dgroup Lounge and the Welcome Center. Tell us how many are coming and we'll assign a table that fits."
        image={{
          src: "/photos/dgroup-lounge.jpg",
          alt: "The Dgroup Lounge at CCF Centris, seen through its glass front",
        }}
      />
      <AtAGlance />
      <Section>
        <Container>
          <Booking />
        </Container>
      </Section>
    </>
  );
}

/** The four things a leader needs to know before anything else. */
function AtAGlance() {
  const facts: [string, string, string][] = [
    ["Days", "Monday to Friday", "Next week opens every Sunday"],
    ["Times", DGROUP_SLOTS.map((s) => s.label.split(" – ")[0]).join(", ").replace(/ PM/g, "") + " PM", "Each slot is 2½ hours"],
    ["Group size", "Up to 12 people", "Tables join for bigger groups"],
    ["Confirmation", "Instant, by email", "With your table and floor plan"],
  ];
  return (
    <div className="border-b border-hairline bg-paper-bright">
      <Container>
        <dl className="grid grid-cols-2 divide-hairline lg:grid-cols-4 lg:divide-x">
          {facts.map(([k, v, note]) => (
            <div key={k} className="py-5 lg:px-6 lg:first:pl-0">
              <dt className="label text-clay">{k}</dt>
              <dd className="font-display mt-1.5 text-lg leading-snug text-ink">{v}</dd>
              <dd className="mt-0.5 text-[0.82rem] text-ink-mute">{note}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </div>
  );
}

async function Booking() {
  // Always render per visitor: this section shows members their own data.
  await connection();
  const today = manilaDateKey();

  if (!bookingOpen(today, preview())) {
    return (
      <div className="space-y-16">
        <div className="grid gap-8 border border-hairline bg-paper-bright p-7 sm:p-9 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="label text-clay">Booking opens</p>
            <p className="font-display mt-2 text-3xl leading-tight text-ink sm:text-4xl">
              {longDateLabel(DGROUP_OPENS_ON)}
            </p>
            <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
              For Dgroups meeting from Monday, October 5. Sign in now and you&rsquo;ll be ready
              to book the moment it opens.
            </p>
          </div>
          <ButtonLink href="/sign-in?next=/reserve/dgroup" size="lg">
            Sign in ahead of time
          </ButtonLink>
        </div>
        <HowItWorks />
        <Rooms />
        <Policies />
      </div>
    );
  }

  if (!hasSupabase()) {
    return (
      <Notice label="Opening soon">
        <p>Table reservations open when member accounts go live.</p>
      </Notice>
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="space-y-16">
        <div className="grid gap-8 border border-hairline bg-paper-bright p-7 sm:p-9 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="label text-clay">Sign in to book</p>
            <p className="font-display mt-2 text-2xl leading-tight text-ink sm:text-3xl">
              Bookings are tied to your email.
            </p>
            <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
              That&rsquo;s how you see, change, or cancel them later. There&rsquo;s no password:
              we email you a link.
            </p>
          </div>
          <ButtonLink href="/sign-in?next=/reserve/dgroup" size="lg">
            Sign in to book
          </ButtonLink>
        </div>
        <HowItWorks />
        <Rooms />
        <Policies />
      </div>
    );
  }

  const now = manilaMinutes();
  const nights: NightOption[] = bookableNights(today)
    .map((date) => ({
      date,
      label: nightLabel(date),
      slots: openSlots(date, today, now).map(({ id, label }) => ({ id, label })),
    }))
    .filter((n) => n.slots.length > 0);

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, mobile")
    .eq("id", user.id)
    .maybeSingle();
  const myName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");

  const { data } = await supabase
    .from("dgroup_table_bookings")
    .select("id, room_slug, table_labels, booked_on, slot_id, group_size")
    .eq("satellite_id", SATELLITE_ID)
    .eq("user_id", user.id)
    .eq("status", "confirmed")
    .gte("booked_on", today)
    .order("booked_on")
    .order("slot_id");
  const mine = (data ?? []) as Row[];

  return (
    <div className="space-y-14">
      {mine.length ? (
        <section aria-labelledby="your-tables-h" id="your-tables" className="scroll-mt-28">
          <h2 id="your-tables-h" className="label text-clay">
            Your bookings
          </h2>
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
                plan={<FloorPlanDrawing room={m.room_slug} highlight={m.table_labels} width={220} />}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="book-h">
        <h2 id="book-h" className="font-display text-2xl text-ink">
          {mine.length ? "Book another slot" : "Book a table"}
        </h2>
        <div className="mt-6">
          <BookingForm
            nights={nights}
            email={user.email ?? ""}
            name={myName}
            mobile={profile?.mobile ?? ""}
          />
        </div>
      </section>
      <Rooms />
    </div>
  );
}

/** "One 8-seater, four 4-seaters and four 2-seaters", biggest first. */
function tableMix(seats: number[]): string {
  const WORDS = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const counts = new Map<number, number>();
  for (const n of seats) counts.set(n, (counts.get(n) ?? 0) + 1);
  const parts = [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([n, c]) => `${c < WORDS.length ? WORDS[c] : c} ${n}-seater${c === 1 ? "" : "s"}`);
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return text.charAt(0) + text.slice(1).toLowerCase();
}

/** Desktop: both rooms at this height, side by side. Phones: stacked, full width. */
const PLAN_HEIGHT = 520;
const PHONE_WIDTH = 300;

/**
 * Both rooms, drawn at the same height so they read as a pair, with each
 * room's table sizes spelled out. Every table is numbered, matching the
 * number in the confirmation email.
 */
function Rooms() {
  return (
    <section aria-labelledby="rooms-h">
      <h2 id="rooms-h" className="font-display text-2xl text-ink">
        The rooms
      </h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
        We choose the room and table for you based on your group size. Each chair is one seat.
      </p>
      <div className="mt-6 flex flex-wrap items-start gap-6">
        {DGROUP_ROOMS.map((r) => {
          const width = floorPlanWidthForHeight(r.slug, PLAN_HEIGHT);
          return (
            <figure key={r.slug} className="max-w-full border border-hairline bg-paper-bright p-5">
              <div className="flex items-baseline justify-between gap-4">
                <figcaption className="font-display text-xl text-ink">{r.name}</figcaption>
                <span className="text-[0.85rem] text-ink-mute">
                  {r.tables.reduce((n, t) => n + t.seats, 0)} seats
                </span>
              </div>
              <p className="mt-1 max-w-[300px] text-[0.85rem] text-ink-mute sm:max-w-none">
                {tableMix(r.tables.map((t) => t.seats))}
              </p>
              {/* The drawing is sized in pixels (it doubles as the email image),
                  so phones get their own narrower copy. */}
              <div className="mt-4 hidden sm:block">
                <FloorPlanDrawing room={r.slug} highlight={[]} width={width} />
              </div>
              <div className="mt-4 sm:hidden">
                <FloorPlanDrawing room={r.slug} highlight={[]} width={PHONE_WIDTH} />
              </div>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps: [string, string][] = [
    ["Pick a day and a time", "Monday to Friday, in one of three slots. Book again for another slot."],
    ["Tell us how many are coming", "Up to 12, including you. We choose a table that fits and join neighbouring tables for bigger groups."],
    ["Get your table by email", "Your table number and a floor plan arrive straight away. Change or cancel from this page."],
  ];
  return (
    <section aria-labelledby="how-h">
      <h2 id="how-h" className="font-display text-2xl text-ink">
        How it works
      </h2>
      <ol className="mt-6 grid gap-px border border-hairline bg-hairline md:grid-cols-3">
        {steps.map(([t, b], i) => (
          <li key={t} className="bg-paper-bright p-6">
            <span className="label tabular text-clay">{String(i + 1).padStart(2, "0")}</span>
            <p className="font-display mt-2 text-lg text-ink">{t}</p>
            <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-soft">{b}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Policies() {
  return (
    <section aria-labelledby="policies-h">
      <h2 id="policies-h" className="font-display text-2xl text-ink">
        Dgroup policies
      </h2>
      <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
        Leaders accept these for their Dgroup when they book.
      </p>
      <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
        {DGROUP_POLICIES.map((p) => (
          <li key={p.id} className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
            <span className="font-semibold text-ink">{p.title}</span>
            <span className="leading-relaxed text-ink-soft">{p.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Notice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="max-w-2xl border-l-2 border-clay bg-paper-bright p-6">
      <p className="label text-clay">{label}</p>
      <div className="mt-3 space-y-5 text-[1.02rem] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}
