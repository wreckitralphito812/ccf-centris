import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { MAX_UPLOAD_MB, PLACEMENTS, SUMMARY_MAX } from "@/lib/announcements";
import { CONTACT } from "@/lib/site";

export const metadata: Metadata = {
  title: "How to post an announcement",
  description:
    "The standard way for CCF Centris ministries to put an event on What's Happening and the screens: five steps, about three minutes.",
};

/**
 * The ministries' SOP for announcements (2026-10-05), as a page anyone can be
 * sent a link to. The artwork table reads the same PLACEMENTS list the form
 * uses, so the guide and the form can't drift apart.
 */

const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: "Make your artwork in the five sizes",
    body: "The same files you already make for the screens. Only Main Hall TV is required, but send the others so every screen at Centris can show it.",
  },
  {
    title: "Post at least 10 days before",
    body: (
      <>
        Go to <strong>ccfcentris.org.ph/announce</strong> and sign in. The first time, tap <strong>Ask for access</strong>{" "}
        and wait for the email that says you&rsquo;re added.
      </>
    ),
  },
  {
    title: "Upload your files",
    body: "Drop each file in its box. The form checks the shape straight away and tells you if a file is the wrong size.",
  },
  {
    title: "Type the key facts",
    body: "Title, ministry, category, every date and time, the venue, one sentence about it, the sign-up link and the fee. Type them even if they're on the picture: phones can't scan a QR code on their own screen.",
  },
  {
    title: "Watch for the email",
    body: "The Centris team reviews it within 2 working days. You'll get an email when it's live, or a short note if something needs changing.",
  },
];

const STATUSES: [string, string][] = [
  ["Waiting for review", "The team hasn't looked at it yet. You can still edit it."],
  ["Changes needed", "Read the team's note, tap Make changes, fix it and send it again."],
  ["Live", "It's on What's Happening, the calendar and the screens."],
  ["Ended", "Its last date has passed, so it came down by itself."],
  ["Withdrawn", "You or the team took it down."],
];

const FAQ: [string, ReactNode][] = [
  [
    "Our event happens on several dates. One announcement or several?",
    "One. Tap “Add another date” for each session. Every date shows on the calendar, and the announcement stays up until the last one.",
  ],
  [
    "We don't have all five sizes.",
    "Send what you have. Main Hall TV is the only one required: it's also the picture on the website. Screens without a file just won't show it.",
  ],
  [
    "Something changed after it went live.",
    "Open ccfcentris.org.ph/announce, tap Edit, change it and send. It goes back for a quick review, then comes back up.",
  ],
  [
    "The event is cancelled.",
    "Tap Withdraw next to it. It comes off the website and the screens.",
  ],
  [
    "Do we still need the QR code on the artwork?",
    "Keep it for the screens and print, but also paste the same link in the form. On the website it becomes a Register button people can tap.",
  ],
  [
    "Who reviews it?",
    <>
      The CCF Centris team. Questions? Email{" "}
      <a href={`mailto:${CONTACT.messageEmail}`} className="font-semibold text-clay underline underline-offset-2">
        {CONTACT.messageEmail}
      </a>
      .
    </>,
  ],
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="calm-card p-7 sm:p-9 print:shadow-none">
      <h2 className="text-[1.35rem] font-bold text-ink">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function AnnounceGuidePage() {
  return (
    <>
      <PageHeader
        eyebrow="For ministries"
        title="How to post an announcement."
        lead="The standard way to get your event on What's Happening and the screens at CCF Centris. Five steps, about three minutes."
      />
      <Section tone="mist">
        <Container className="max-w-4xl space-y-6">
          <div className="flex flex-wrap gap-3 print:hidden">
            <ButtonLink href="/announce" size="lg">
              Post an announcement
            </ButtonLink>
            <ButtonLink href="/sign-up?next=/announce" size="lg" tone="outline">
              New here? Create an account
            </ButtonLink>
          </div>

          <Block title="The five steps">
            <ol className="space-y-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-clay text-[1.05rem] font-bold text-paper-bright">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[1.08rem] font-bold text-ink">{s.title}</p>
                    <p className="mt-1 leading-relaxed text-ink-soft">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Block>

          <Block title="Your artwork">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[30rem] text-left text-[0.98rem]">
                <thead>
                  <tr className="border-b border-rule text-[0.85rem] text-ink-mute">
                    <th className="py-2.5 pr-4 font-semibold">File</th>
                    <th className="py-2.5 pr-4 font-semibold">Size (pixels)</th>
                    <th className="py-2.5 pr-4 font-semibold">Where it shows</th>
                    <th className="py-2.5 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {PLACEMENTS.map((p) => (
                    <tr key={p.key}>
                      <td className="py-3 pr-4 font-semibold text-ink">{p.label}</td>
                      <td className="py-3 pr-4 tabular-nums text-ink-soft">
                        {p.w} × {p.h}
                      </td>
                      <td className="py-3 pr-4 text-ink-soft">{p.use}</td>
                      <td className="py-3">
                        {p.required ? (
                          <span className="rounded-full bg-clay-wash px-2.5 py-0.5 text-[0.8rem] font-semibold text-clay-deep">Required</span>
                        ) : (
                          <span className="text-[0.85rem] text-ink-mute">If you have it</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-5 space-y-2 text-[0.98rem] leading-relaxed text-ink-soft">
              <li>• JPG or PNG, under {MAX_UPLOAD_MB} MB each.</li>
              <li>• Use the exact sizes above. A file the wrong shape is turned away, so the screens never stretch it.</li>
              <li>• Keep important words away from the edges: some screens trim a little.</li>
              <li>• Main Hall TV is also the picture on the website, so make sure the title and date read clearly at a small size.</li>
            </ul>
          </Block>

          <Block title="What to type">
            <dl className="grid gap-x-6 gap-y-3 text-[0.98rem] sm:grid-cols-[11rem_minmax(0,1fr)]">
              {[
                ["Title", "Up to 80 characters, e.g. Family Camp Lite."],
                ["Ministry", "Who it's from, e.g. Elevate or The Neighborhood."],
                ["Category", "Church-wide events, or Trainings and classes."],
                ["In one sentence", `What it is and who it's for, up to ${SUMMARY_MAX} characters.`],
                ["When", "Every date, with start and end times. Add another date for a series."],
                ["Where", "Main Hall, Welcome Center, a room, or another place."],
                ["Sign-up", "The full link (the one your QR code opens), or no sign-up needed."],
                ["Fee", "Free, or the fee as you'd say it, e.g. ₱600 adults, ₱400 kids, free for 6 and below."],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-semibold text-ink">{k}</dt>
                  <dd className="text-ink-soft">{v}</dd>
                </div>
              ))}
            </dl>
          </Block>

          <Block title="After you send it">
            <ul className="space-y-3">
              {STATUSES.map(([k, v]) => (
                <li key={k} className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                  <span className="w-44 shrink-0 font-semibold text-ink">{k}</span>
                  <span className="text-ink-soft">{v}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[0.98rem] leading-relaxed text-ink-soft">
              Everything comes down by itself after its last date. You never need to ask for it to be removed.
            </p>
          </Block>

          <Block title="Common questions">
            <dl className="space-y-5">
              {FAQ.map(([q, a]) => (
                <div key={q}>
                  <dt className="font-bold text-ink">{q}</dt>
                  <dd className="mt-1 leading-relaxed text-ink-soft">{a}</dd>
                </div>
              ))}
            </dl>
          </Block>

          <p className="text-center text-[0.95rem] text-ink-mute print:hidden">
            Ready?{" "}
            <Link href="/announce" className="font-semibold text-clay underline underline-offset-2">
              Post an announcement
            </Link>
          </p>
        </Container>
      </Section>
    </>
  );
}
