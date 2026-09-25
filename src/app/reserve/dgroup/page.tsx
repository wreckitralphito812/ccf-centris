import { connection } from "next/server";
import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { FloorPlanDrawing } from "@/components/floor-plan";
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
        lead="Monday to Friday in the Dgroup Lounge and the Welcome Center. Tell us how many are coming and we'll assign your table."
      />
      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div>
              <Booking />
            </div>
            <aside className="space-y-6 lg:sticky lg:top-28">
              <figure>
                <div className="relative aspect-[16/9] overflow-hidden border border-hairline bg-paper">
                  <Image
                    src="/photos/dgroup-lounge.jpg"
                    alt="The Dgroup Lounge at CCF Centris, seen through its glass front"
                    fill
                    sizes="(min-width: 1024px) 22rem, 100vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-2 text-[0.85rem] text-ink-mute">The Dgroup Lounge</figcaption>
              </figure>
              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">How it works</p>
                <ol className="mt-4 space-y-3 text-[0.92rem] leading-relaxed text-ink-soft">
                  {[
                    "Pick a day and one time slot. Book again for another slot.",
                    "Tell us the leader's details and how many are coming, up to 12.",
                    "Accept the policies. We assign your table, joining neighbouring tables for bigger groups.",
                    "Your table number and a floor plan arrive by email.",
                  ].map((step, i) => (
                    <li key={step} className="flex gap-3">
                      <span className="label shrink-0 text-clay">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">Times</p>
                <p className="mt-3 text-[0.92rem] text-ink-soft">Monday to Friday</p>
                <ul className="mt-2 space-y-1 text-[0.95rem] text-ink">
                  {DGROUP_SLOTS.map((s) => (
                    <li key={s.id}>{s.label}</li>
                  ))}
                </ul>
                <p className="mt-4 text-[0.85rem] leading-relaxed text-ink-mute">
                  You can book the days left in the current week. Next week opens
                  every Sunday.
                </p>
              </div>
              <div className="border-l-2 border-clay bg-paper-bright p-6">
                <p className="label text-clay">Policies</p>
                <ul className="mt-4 space-y-4">
                  {DGROUP_POLICIES.map((r) => (
                    <li key={r.id}>
                      <p className="font-semibold text-ink">{r.title}</p>
                      <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">{r.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
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
      <div className="space-y-10">
        <Notice label="Sign in to book">
          <p>
            Sign in with your email so you can see, change, or cancel your bookings later. We
            send you a link; there&rsquo;s no password.
          </p>
          <ButtonLink href="/sign-in?next=/reserve/dgroup">Sign in to book a table</ButtonLink>
        </Notice>
        <Rooms />
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
        <h2 id="book-h" className="label text-clay">
          {mine.length ? "Book another slot" : "Book a table"}
        </h2>
        <div className="mt-5">
          <BookingForm
            nights={nights}
            email={user.email ?? ""}
            name={myName}
            mobile={profile?.mobile ?? ""}
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
    <div className="max-w-2xl border-l-2 border-clay bg-paper-bright p-6">
      <p className="label text-clay">{label}</p>
      <div className="mt-3 space-y-5 text-[1.02rem] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}
