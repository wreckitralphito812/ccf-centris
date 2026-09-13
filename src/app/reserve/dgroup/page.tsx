import { connection } from "next/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { cancelDgroupBooking } from "@/app/actions/dgroup-tables";
import {
  bookableNights,
  DGROUP_ROOMS,
  DGROUP_SLOTS,
  HOUSE_RULES,
  manilaMinutes,
  nightLabel,
  openSlots,
} from "@/lib/dgroup-tables";
import { manilaDateKey } from "@/lib/format";
import { hasSupabase, SATELLITE_ID } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/ssr";
import { BookingForm, type NightOption } from "./booking-form";

export const metadata: Metadata = {
  title: "Reserve a Dgroup table",
  description:
    "Book a weeknight table for your Dgroup in the Dgroup Lounge or the Welcome Center at CCF Centris.",
};

interface MyBooking {
  id: string;
  room_slug: string;
  table_label: string;
  booked_on: string;
  slot_id: string;
  group_size: number;
  status: string;
}

export default function DgroupTablesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Reserve · Dgroup meeting"
        title="Book a table for your Dgroup."
        lead="Weeknight tables in the Dgroup Lounge and the Welcome Center. Tell us how many are coming and we'll assign a table that fits."
      />
      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <div>
              <Booking />
            </div>
            <aside className="space-y-6 lg:sticky lg:top-28">
              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">How it works</p>
                <ol className="mt-4 space-y-3 text-[0.92rem] leading-relaxed text-ink-soft">
                  {[
                    "Pick a night and a time. Tables are booked in two-hour blocks.",
                    "Give the leader's name, a contact number, and how many are coming.",
                    "We hold the smallest free table that fits your group.",
                    "A Centris admin approves it, and your table number appears here.",
                  ].map((step, i) => (
                    <li key={step} className="flex gap-3">
                      <span className="label shrink-0 text-clay">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="border-l-2 border-clay bg-paper-bright p-6">
                <p className="label text-clay">House rules</p>
                <ul className="mt-4 space-y-4">
                  {HOUSE_RULES.map((r) => (
                    <li key={r.id}>
                      <p className="font-semibold text-ink">{r.title}</p>
                      <p className="mt-1 text-[0.88rem] leading-relaxed text-ink-soft">{r.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="text-[0.82rem] leading-relaxed text-ink-mute">
                The nights, times, and tables here are placeholders while CCF
                Centris finalizes the schedule.
              </p>
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
  if (!hasSupabase()) {
    return (
      <Notice label="Opening soon">
        <p>Table reservations open once member accounts are switched on for the site.</p>
      </Notice>
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Notice label="Sign in to book">
        <p>You&rsquo;ll need a CCF Centris account so we can hold the table for you.</p>
        <ButtonLink href="/sign-in?next=/reserve/dgroup">Sign in to book a table</ButtonLink>
      </Notice>
    );
  }

  const today = manilaDateKey();
  const now = manilaMinutes();
  const nights: NightOption[] = bookableNights(today)
    .map((date) => ({
      date,
      label: nightLabel(date),
      slots: openSlots(date, today, now).map(({ id, label }) => ({ id, label })),
    }))
    .filter((n) => n.slots.length > 0);

  const { data } = await supabase
    .from("dgroup_table_bookings")
    .select("id, room_slug, table_label, booked_on, slot_id, group_size, status")
    .eq("satellite_id", SATELLITE_ID)
    .eq("user_id", user.id)
    .in("status", ["pending", "confirmed"])
    .gte("booked_on", today)
    .order("booked_on");
  const mine = (data ?? []) as MyBooking[];

  return (
    <div className="space-y-12">
      <BookingForm nights={nights} />

      {mine.length ? (
        <section aria-labelledby="your-tables">
          <h2 id="your-tables" className="label text-clay">
            Your tables
          </h2>
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {mine.map((m) => {
              const approved = m.status === "confirmed";
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-display text-xl text-ink">
                      {/* The table is already held either way, but it is only
                          named once an admin has approved the request — until
                          then "Table 7" would read as a promise we haven't
                          made yet. */}
                      {approved
                        ? `Table ${m.table_label}`
                        : "Table to be confirmed"}{" "}
                      &middot;{" "}
                      {DGROUP_ROOMS.find((r) => r.slug === m.room_slug)?.name ?? m.room_slug}
                    </p>
                    <p className="mt-0.5 text-[0.9rem] text-ink-soft">
                      {nightLabel(m.booked_on)},{" "}
                      {DGROUP_SLOTS.find((s) => s.id === m.slot_id)?.label ?? m.slot_id} &middot;{" "}
                      {m.group_size} {m.group_size === 1 ? "person" : "people"}
                    </p>
                    <p
                      className={
                        approved
                          ? "label mt-2 inline-flex border border-moss/50 px-2 py-1 text-moss"
                          : "label mt-2 inline-flex border border-clay/50 px-2 py-1 text-clay-deep"
                      }
                    >
                      {approved ? "Approved" : "Waiting for approval"}
                    </p>
                  </div>
                  <form action={cancelDgroupBooking}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className="label text-ink-mute transition-colors hover:text-sky">
                      Cancel
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
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
