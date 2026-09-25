import type { Metadata } from "next";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { CONTACT, MAPS_EMBED, SITE } from "@/lib/site";
import { hasSupabase } from "@/lib/supabase/server";
import { currentUser } from "@/lib/supabase/ssr";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with CCF Centris at Eton Centris, EDSA corner Quezon Avenue, Quezon City.",
};

/**
 * "Leave a message" opens the visitor's own email app instead of posting a
 * form. No mail service is wired up yet, and a form that says "sent" without
 * delivering anything is worse than no form: people wait on a reply that was
 * never coming. A mailto link always arrives.
 */
const MESSAGE_HREF = `mailto:${CONTACT.messageEmail}?subject=${encodeURIComponent(
  CONTACT.messageSubject,
)}`;

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Ask us anything."
        lead="Send us your questions about Sunday, Dgroups, serving, or using the center."
        image={{
          src: "/photos/welcome-center.jpg",
          alt: "The Welcome Center at CCF Centris, with its glass front and seating inside",
        }}
      />

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_22rem] lg:items-start">
            <div className="max-w-2xl">
              <dl className="divide-y divide-hairline border-y border-hairline">
                {CONTACT.officeHours ? (
                  <ContactRow label="Office hours">{CONTACT.officeHours}</ContactRow>
                ) : null}
                <ContactRow label="Email">
                  <a
                    href={`mailto:${CONTACT.messageEmail}`}
                    className="tap break-all text-clay underline underline-offset-4"
                  >
                    {CONTACT.messageEmail}
                  </a>
                </ContactRow>
              </dl>

              <div className="mt-10">
                <LeaveAMessage />
              </div>
            </div>

            <aside className="space-y-6 lg:sticky lg:top-28">
              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">Visit us</p>
                <address className="font-display mt-3 text-xl not-italic leading-snug">
                  {SITE.addressLines.map((l) => (
                    <span key={l} className="block">
                      {l}
                    </span>
                  ))}
                </address>
                <ButtonLink
                  href="/visit#getting-here"
                  tone="outline"
                  full
                  className="mt-5"
                >
                  Directions
                </ButtonLink>
              </div>

              <div className="border border-hairline bg-paper-bright p-2">
                <iframe
                  title="Map showing CCF Centris"
                  src={MAPS_EMBED}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="aspect-square w-full"
                />
              </div>

              <div className="border-l-2 border-clay bg-paper-bright p-6">
                <p className="label text-clay">Need prayer?</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                  Post a request on the Prayer Wall and the church will pray for
                  you.
                </p>
                <ButtonLink href="/prayer-wall" tone="outline" full className="mt-4">
                  Go to the Prayer Wall
                </ButtonLink>
              </div>

              <div className="border border-hairline bg-paper-bright p-6">
                <p className="label text-clay">CCF nationwide</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">
                  For other CCF centers and ministries, go to CCF&rsquo;s main
                  site.
                </p>
                <a
                  href="https://www.ccf.org.ph"
                  target="_blank"
                  rel="noreferrer"
                  className="label tap mt-3 text-clay underline underline-offset-4"
                >
                  ccf.org.ph
                </a>
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}

/**
 * "Leave us a message", for signed-in members only.
 *
 * CCF Centris asked for the gate: a message that arrives attached to a real
 * account is one the team can be sure of and can reply to, and it keeps the
 * site from turning into somewhere to post anonymous reviews of the church.
 *
 * Signing in is the whole of the gate — the message itself still leaves from
 * the member's own mail app, so nothing is lost in transit and no inbox has to
 * be built to receive it.
 */
async function LeaveAMessage() {
  // Checked before `connection()` on purpose. With no accounts configured
  // there is no session to read and every visitor sees the same panel, so the
  // page can still be prerendered; only the signed-in branch below is
  // genuinely per-visitor.
  if (!hasSupabase()) {
    return (
      <Gate title="Opening soon.">
        <p>
          You&rsquo;ll need a CCF Centris account to leave a message here, and
          accounts aren&rsquo;t open yet. Until then, email us at the address
          above.
        </p>
      </Gate>
    );
  }

  // From here the answer depends on who is asking.
  await connection();
  const user = await currentUser();

  if (!user) {
    return (
      <Gate title="Sign in to leave a message.">
        <p>
          We ask you to sign in so we know who we&rsquo;re talking to and can
          write back. There&rsquo;s no password: we email you a link.
        </p>
        <ButtonLink href="/sign-in?next=/contact" size="lg" className="mt-6">
          Sign in to leave a message
        </ButtonLink>
      </Gate>
    );
  }

  return (
    <>
      <h2 className="display-md">Leave us a message.</h2>
      <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft">
        This opens your email app with a message to the CCF Centris team. Send
        it from <span className="text-ink">{user.email}</span> so our reply
        lands in the same thread.
      </p>
      <ButtonLink href={MESSAGE_HREF} size="lg" className="mt-6">
        Leave a message
      </ButtonLink>
    </>
  );
}

/** The members-only panel shown in place of the message button. */
function Gate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-clay bg-paper-bright p-6 sm:p-7">
      <p className="label text-clay">Members only</p>
      <h2 className="display-md mt-3">{title}</h2>
      <div className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-ink-soft">
        {children}
      </div>
    </div>
  );
}

function ContactRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
      <dt className="label text-ink-mute">{label}</dt>
      <dd className="text-[1.02rem] text-ink">{children}</dd>
    </div>
  );
}
