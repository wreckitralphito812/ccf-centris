import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { CONNECT_LINKS, SOCIALS, YOUTUBE } from "@/lib/site";
import { FacebookGlyph, InstagramGlyph, YouTubeGlyph } from "@/components/icons";

export const metadata: Metadata = {
  title: "Connect",
  description: "Join a Dgroup, sign up to serve, and follow CCF Centris.",
};

/** Center-owned accounts. A null URL renders as "coming soon". */
const ACCOUNTS = [
  { label: "Facebook", href: SOCIALS.facebook, Glyph: FacebookGlyph },
  { label: "Instagram", href: SOCIALS.instagram, Glyph: InstagramGlyph },
  { label: "YouTube", href: YOUTUBE.channelUrl, Glyph: YouTubeGlyph },
];

export default function ConnectPage() {
  return (
    <>
      <PageHeader
        eyebrow="Connect"
        title="Find your place at CCF Centris."
        lead="Join a Dgroup, serve on a team, and follow along for what's happening at the center."
      />

      <Section>
        <Container>
          <div className="grid gap-6 md:grid-cols-2">
            <Pathway
              eyebrow="Find a Dgroup"
              title="Grow in a small group."
              body="A Dgroup is a small group that meets every week to study the Word, pray, and follow Jesus together. Sign up through CCF's Dgroup form to get connected with one."
              href={CONNECT_LINKS.dgroupSignup}
              cta="Find a Dgroup"
            />
            <Pathway
              eyebrow="#GoServe"
              title="Serve on a team."
              body="There's a place at CCF Centris for every kind of gift. Sign up through CCF's volunteer portal and choose where you'd like to serve."
              href={CONNECT_LINKS.volunteerSignup}
              cta="Sign up to serve"
            />
          </div>

          <div className="mt-14 border-t border-hairline pt-8">
            <p className="label text-clay">Follow CCF Centris</p>
            <ul className="mt-4 flex flex-wrap gap-3">
              {ACCOUNTS.map((a) => (
                <li key={a.label}>
                  {a.href ? (
                    <a
                      href={a.href}
                      target="_blank"
                      rel="noreferrer"
                      className="label tap gap-2 border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                    >
                      <a.Glyph className="h-4 w-4" />
                      {a.label}
                    </a>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="label tap gap-2 border border-hairline px-4 py-2.5 text-ink-mute"
                    >
                      {a.label}
                      <span className="text-[0.62rem] tracking-[0.12em] text-ink-mute/80">
                        Coming soon
                      </span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Pathway({
  eyebrow,
  title,
  body,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col border border-hairline bg-paper-bright p-7">
      <p className="label text-clay">{eyebrow}</p>
      <h2 className="display-md mt-3">{title}</h2>
      <p className="mt-4 flex-1 text-[1rem] leading-relaxed text-ink-soft">{body}</p>
      <ButtonLink
        href={href}
        target="_blank"
        rel="noreferrer"
        size="lg"
        className="mt-6 self-start"
      >
        {cta}
      </ButtonLink>
    </div>
  );
}
