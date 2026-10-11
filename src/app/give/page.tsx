import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { GIVE_HELP, GIVE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Give",
  description:
    "Give your tithes and offerings to CCF: debit or credit card, bank transfer, bills payment, or PH QR Pay.",
};

/**
 * Giving (2026-10-11). CCF's giving form lives on its own site, and framed
 * here it brought its full-page photo background with it, which Ralph found
 * untidy; there's no way to frame just its form. So the four ways to give are
 * set out here in the site's own design, and each opens CCF's secure form (or
 * CCF's own guide) in a new tab, where the payment happens. Bank and card
 * checks also work best there.
 */
const METHODS: { title: string; via: string; body: string; channels: string; cta: string; href: string }[] = [
  {
    title: "Debit or credit card",
    via: "ATM, debit or credit card",
    body: "Give online with your card. Choose the card option on CCF's giving form.",
    channels: "Mastercard · Visa",
    cta: "Give by card",
    href: GIVE_URL,
  },
  {
    title: "Bank transfer",
    via: "Bank transfer, deposit or bills payment",
    body: "Send from your bank or e-wallet. Choose bank transfer on CCF's giving form for the account details.",
    channels: "GCash · BDO · BPI · RCBC · UnionBank and others",
    cta: "Give by bank transfer",
    href: GIVE_URL,
  },
  {
    title: "Bills payment",
    via: "Pay CCF as a biller",
    body: "Add CCF as a biller in your bank or e-wallet app. CCF's step-by-step guides show how for each one.",
    channels: "GCash · BDO · BPI · RCBC · UnionBank and others",
    cta: "See the guides",
    href: GIVE_HELP.billsPayment,
  },
  {
    title: "PH QR Pay",
    via: "Scan CCF's QR code",
    body: "Scan CCF's QR code with your banking or e-wallet app. Choose “View CCF QR images” on CCF's giving form.",
    channels: "GCash · GoTyme · Grab · ShopeePay · BDO Pay and others",
    cta: "View CCF's QR codes",
    href: GIVE_URL,
  },
];

export default function GivePage() {
  return (
    <>
      <PageHeader
        eyebrow="Give"
        title="Thank you for your heart to give."
        lead="Your tithes and offerings go to Christ's Commission Fellowship. Choose how you'd like to give; each way opens CCF's secure giving form or guide."
      />

      <Section>
        <Container>
          <div className="grid gap-5 md:grid-cols-2">
            {METHODS.map((m) => (
              <article key={m.title} className="calm-card flex flex-col p-6 sm:p-8">
                <p className="text-[0.9rem] font-semibold text-clay">{m.via}</p>
                <h2 className="mt-1.5 text-[1.5rem] font-semibold tracking-[-0.01em] text-ink">{m.title}</h2>
                <p className="mt-3 leading-relaxed text-ink-soft">{m.body}</p>
                <p className="mt-4 text-[0.9rem] text-ink-mute">{m.channels}</p>
                <div className="mt-auto pt-6">
                  <a
                    href={m.href}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-press inline-flex min-h-12 items-center gap-2 rounded-lg bg-clay px-5 text-[1rem] font-semibold text-paper-bright transition-colors hover:bg-clay-deep"
                  >
                    {m.cta}
                    <span aria-hidden>↗</span>
                    <span className="sr-only">(opens CCF&rsquo;s site in a new tab)</span>
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <figure className="rounded-2xl bg-night p-7 text-paper-bright sm:p-9">
              <blockquote className="text-[1.15rem] leading-relaxed sm:text-[1.3rem]">
                &ldquo;Honor the Lord with your wealth and with the first and best part of all your income. Then your
                barns will be full, and your vats will overflow with fresh wine.&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-[0.95rem] font-semibold tracking-[0.04em] text-paper-bright/90">
                PROVERBS 3:9–10
              </figcaption>
            </figure>
            <div className="calm-card p-7 sm:p-9">
              <h2 className="text-[1.2rem] font-semibold text-ink">Need a certificate of donation?</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">
                On CCF&rsquo;s giving form, choose <strong className="text-ink">CCFMI</strong> under &ldquo;Where to
                give&rdquo; in the allocation step.
              </p>
              <p className="mt-4 text-[0.95rem] text-ink-mute">
                Questions about giving?{" "}
                <a href={GIVE_HELP.faqs} target="_blank" rel="noreferrer" className="font-semibold text-clay underline underline-offset-4">
                  Read CCF&rsquo;s giving FAQs
                </a>
                .
              </p>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
