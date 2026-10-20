import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { IconLine } from "@/components/booking";
import { MAX_HOURS, peso, rentalDays, SPORTS } from "@/lib/court-rentals";
import { manilaDateKey } from "@/lib/format";
import { currentUser, hasAccounts } from "@/lib/auth/session";
import { getCourtHolds, getMyContact, getMyCourtRentals, getMyDgroups } from "@/lib/queries";
import { CourtForm } from "./court-form";

export const metadata: Metadata = {
  title: "Rent a court",
  description:
    "Rent a court in the Gym at CCF Centris for pickleball, badminton, volleyball or basketball. For registered Dgroups.",
};

/**
 * Gym court rentals (Adrian, 2026-10-20): the same calm booking card as the
 * Dgroup tables, with one more step, paying by QR code and uploading the
 * screenshot. For leaders of registered Dgroups, like the tables.
 */
export default function CourtsPage() {
  const perCourt = SPORTS.filter((s) => s.courts > 1);
  const wholeFloor = SPORTS.filter((s) => s.courts === 1);
  return (
    <>
      <PageHeader
        eyebrow="Reserve · Gym"
        title="Rent a court in the Gym."
        lead="Pick a day, a sport and a time, then pay with the QR code. You're booked as soon as you upload the screenshot."
      />
      <Section tone="mist">
        <Container className="max-w-2xl lg:max-w-6xl">
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <IconLine icon="calendar">Sunday and Tuesday to Friday</IconLine>
            <IconLine icon="clock">1 to {MAX_HOURS} hours, up to a week ahead</IconLine>
            <IconLine icon="people">
              {perCourt.map((s) => s.name).join(" or ")}: {peso(perCourt[0].rate)} a court an hour
            </IconLine>
            <IconLine icon="pin">
              {wholeFloor.map((s) => s.name).join(" or ")}: {peso(wholeFloor[0].rate)} an hour
            </IconLine>
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

  if (!hasAccounts()) {
    return (
      <Notice label="Opening soon">
        <p>Court rentals open when member accounts go live.</p>
      </Notice>
    );
  }

  const user = await currentUser();
  if (!user) {
    return (
      <Notice label="Sign in to book">
        <p>Court rentals are for leaders of a registered Dgroup. Sign in, and you can move your rental later if plans change.</p>
        <ButtonLink href="/sign-in?next=/reserve/courts">Sign in to rent a court</ButtonLink>
      </Notice>
    );
  }

  const days = rentalDays(today);
  const [contact, mine, holds, myDgroups] = await Promise.all([
    getMyContact(),
    getMyCourtRentals(today),
    getCourtHolds(days),
    getMyDgroups(user.id),
  ]);
  // Only registered Dgroups rent courts (Adrian, 2026-10-20), as with tables.
  const registered = myDgroups.filter((d) => d.status === "approved" || d.status === "pending");

  return (
    <div className="space-y-8">
      {mine.length ? (
        <Link
          href="/my/reservations"
          className="calm-card flex items-center justify-between gap-4 px-7 py-5 transition-shadow hover:shadow-lg"
        >
          <span className="text-[1rem] text-ink">
            You have <span className="font-semibold">{mine.length} upcoming {mine.length === 1 ? "rental" : "rentals"}</span>.
          </span>
          <span className="shrink-0 text-[0.98rem] font-semibold text-clay">See or move them</span>
        </Link>
      ) : null}

      {registered.length ? (
        <CourtForm
          days={days}
          holds={holds}
          email={contact?.email || user.email}
          name={contact?.name ?? ""}
          mobile={contact?.mobile ?? ""}
          dgroups={registered.map((d) => ({ id: d.id, name: d.name, leaderName: d.leader_name ?? "", leaderMobile: d.leader_mobile ?? "" }))}
        />
      ) : (
        <Notice label="Register your Dgroup first">
          <p>
            Court rentals are for registered Dgroups. Tell us about your group once: its name, when it meets, and your own
            Dgroup leader. Then come back here to book.
          </p>
          <ButtonLink href={myDgroups.length ? "/my/dgroups" : "/my/dgroups/new"}>
            {myDgroups.length ? "See my Dgroups" : "Register my Dgroup"}
          </ButtonLink>
        </Notice>
      )}
    </div>
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
