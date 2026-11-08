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
 * untidy; there's no way to frame just its form. The four ways to give had a
 * card each, but every card opened the same page, since CCF's form can't be
 * linked to one way. So they're one card now, with one button (Adrian,
 * 2026-11-08). The payment happens on CCF's site, in a new tab.
 */
const WAYS = "Debit or credit card, bank transfer, bills payment, or PH QR Pay";

export default function GivePage() {
  return (
    <>
      <PageHeader
        eyebrow="Give"
        title="Thank you for your heart to give."
        lead="Your tithes and offerings go to Christ's Commission Fellowship, through CCF's secure giving page."
      />

      <Section>
        <Container>
          <article className="calm-card flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-[0.9rem] font-semibold text-clay">{WAYS}</p>
              <h2 className="mt-1.5 text-[1.5rem] font-semibold tracking-[-0.01em] text-ink">Give online</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">
                CCF&rsquo;s secure giving page has every way to give: card, bank transfer, bills payment through your bank or
                e-wallet, and CCF&rsquo;s QR codes for GCash, GoTyme and other apps. Pick the one you like there.
              </p>
            </div>
            <div className="shrink-0">
              <a
                href={GIVE_URL}
                target="_blank"
                rel="noreferrer"
                className="btn-press inline-flex min-h-12 items-center gap-2 rounded-lg bg-clay px-6 text-[1rem] font-semibold text-paper-bright transition-colors hover:bg-clay-deep"
              >
                Give now
                <span aria-hidden>↗</span>
                <span className="sr-only">(opens CCF&rsquo;s giving page in a new tab)</span>
              </a>
            </div>
          </article>

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
