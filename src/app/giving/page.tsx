import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import {
  ButtonLink,
  Container,
  Eyebrow,
  Section,
  SectionHead,
} from "@/components/ui";

export const metadata: Metadata = {
  title: "Giving",
  description:
    "How to give at CCF Centris. Giving goes through CCF's own official channels: bills payment, bank transfer, and card.",
};

/**
 * Deliberately a signpost, not a payment form.
 *
 * Giving must go through CCF's own verified merchant accounts. This site does
 * not collect card details, does not hold funds, and does not publish account
 * numbers, because a number transcribed onto a satellite site is exactly how
 * donation fraud works. Everything routes to CCF's official page instead.
 */
const CCF_GIVE_URL = "https://www.ccf.org.ph/give/";

export default function GivingPage() {
  return (
    <>
      <PageHeader
        eyebrow="Giving"
        title="Give as an act of worship."
        lead="CCF teaches giving as a response to God's generosity rather than an entry fee. Nobody is ever pressured, and no offering plate is passed down the row."
        actions={
          <a
            href={CCF_GIVE_URL}
            target="_blank"
            rel="noreferrer"
            className="label inline-flex items-center border border-clay bg-clay px-7 py-3.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            Give through CCF
          </a>
        }
      />

      {/* The honest bit, first */}
      <Section className="py-12">
        <Container>
          <div className="max-w-3xl border-l-2 border-clay bg-paper-bright py-6 pl-7 pr-6">
            <Eyebrow>Before you give</Eyebrow>
            <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-soft">
              Giving is handled entirely through CCF&rsquo;s own official
              channels. This site does not take card details, does not hold
              funds, and does not publish account numbers.
            </p>
            <p className="mt-3 text-[1.02rem] leading-relaxed text-ink-soft">
              If you ever see CCF bank details posted somewhere other than
              CCF&rsquo;s official website or spoken from the platform, treat
              them as fraudulent and tell the team.
            </p>
          </div>
        </Container>
      </Section>

      {/* Methods, described but never transcribed */}
      <Section tone="deep">
        <Container>
          <SectionHead
            eyebrow="How to give"
            title="CCF's official channels"
            lead="Each of these is set up and verified by CCF. Open CCF's giving page for the current details."
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            {[
              [
                "Bills payment",
                "Through partner banks and payment centres, the way you would settle a utility bill.",
              ],
              [
                "Bank transfer",
                "Direct transfer or deposit to CCF's official accounts, listed on CCF's giving page.",
              ],
              [
                "Card and ATM",
                "One-time or recurring giving by card, processed by CCF's payment provider.",
              ],
              [
                "In person",
                "Drop boxes at the Welcome Center. Nothing is passed around during the service.",
              ],
            ].map(([t, b]) => (
              <div key={t} className="bg-paper-bright p-6">
                <h3 className="font-display text-xl">{t}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
                  {b}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <a
              href={CCF_GIVE_URL}
              target="_blank"
              rel="noreferrer"
              className="label inline-flex items-center border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
            >
              Open CCF&rsquo;s giving page
            </a>
          </div>
        </Container>
      </Section>

      {/* Why CCF teaches this */}
      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <Eyebrow>Why we give</Eyebrow>
              <h2 className="display-md mt-5">
                Not a transaction.
              </h2>
              <p className="mt-5 leading-relaxed text-ink-soft">
                One of CCF&rsquo;s core values names tithes and offerings
                alongside serving and stewardship: using time, talent, and
                treasure well because none of it originated with us.
              </p>
              <blockquote className="mt-8 border-l-2 border-clay pl-6">
                <p className="text-[1.02rem] italic leading-relaxed text-ink-soft">
                  &ldquo;Each one must do just as he has purposed in his heart,
                  not grudgingly or under compulsion, for God loves a cheerful
                  giver.&rdquo;
                </p>
                <cite className="label mt-3 block not-italic text-clay">
                  2 Corinthians 9:7
                </cite>
              </blockquote>
            </div>

            <ul className="grid gap-px border border-hairline bg-hairline">
              {[
                ["You are never required to give", "Not to attend, not to join a Dgroup, not to use the Sports Hall, not to be part of anything here."],
                ["Guests especially", "If it is your first Sunday, please do not give. Come and see what this is first."],
                ["Where it goes", "Running the center, supporting staff and missionaries, community outreach, and CCF's wider work."],
                ["Questions about finances", "Ask. The Centris team can explain how giving is handled and accounted for."],
              ].map(([t, b]) => (
                <li key={t} className="bg-paper-bright p-6">
                  <h3 className="font-display text-lg">{t}</h3>
                  <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-soft">
                    {b}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section tone="ink">
        <Container>
          <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display-md">Another way to give.</h2>
              <p className="mt-4 max-w-xl leading-relaxed text-paper-bright/70">
                Time is worth as much as money to a center that runs on
                volunteers. If giving financially is not where you are, serving
                is genuinely just as useful.
              </p>
            </div>
            <ButtonLink
              href="/serve"
              className="border-paper-bright bg-paper-bright text-night hover:bg-bone hover:border-bone"
            >
              Find a ministry
            </ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
