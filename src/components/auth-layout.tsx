import type { ReactNode } from "react";
import { IconLine } from "./booking";
import { Container, Section } from "./ui";

/**
 * The sign-in and sign-up page frame (2026-09-30). On a laptop it splits: a
 * welcome and what an account is for on the left, a roomy form card on the
 * right. On phones it stacks, with the welcome kept short so the form comes up
 * quickly. Ralph found the single narrow card cramped even on a laptop.
 */
export function AuthLayout({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <Section tone="mist" className="pt-8! pb-16! sm:pt-14! lg:py-20!">
      <Container className="grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:items-center lg:gap-16">
        <div className="max-w-xl lg:pr-4">
          <p className="text-[0.95rem] font-semibold text-clay">{eyebrow}</p>
          <h1 className="page-title mt-2 text-balance">{title}</h1>
          <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-mute">{lead}</p>
          <div className="mt-8 hidden space-y-3.5 lg:block">
            <IconLine icon="calendar">Book a table for your Dgroup, Monday to Friday</IconLine>
            <IconLine icon="pin">Request a room for your ministry</IconLine>
            <IconLine icon="people">Post and pray on the Prayer Wall</IconLine>
            <IconLine icon="check">See, change and cancel your bookings in one place</IconLine>
          </div>
        </div>
        <div className="calm-card w-full px-6 py-8 sm:px-10 sm:py-10">{children}</div>
      </Container>
    </Section>
  );
}
