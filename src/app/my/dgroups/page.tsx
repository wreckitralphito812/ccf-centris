import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section, cx } from "@/components/ui";
import { archiveMyDgroup } from "@/app/actions/dgroups";
import { currentUser } from "@/lib/auth/session";
import { AUDIENCES, DGROUP_STATUS, WHERE, labelOf, scheduleText } from "@/lib/dgroup-registry";
import { getMyDgroups } from "@/lib/queries";
import { CONNECT_LINKS } from "@/lib/site";

export const metadata: Metadata = { title: "Your Dgroups" };
export const dynamic = "force-dynamic";

const TONE = {
  clay: "bg-clay-wash text-clay-deep",
  moss: "bg-moss/15 text-moss",
  sky: "bg-sky-wash text-sky",
  ink: "bg-ink/10 text-ink-soft",
};

/**
 * The Dgroups this member leads (2026-10-08): register one, see whether the
 * team has approved it, keep its details current, or mark it as stopped.
 * Only the leader and the admins see these.
 */
export default async function MyDgroupsPage({ searchParams }: PageProps<"/my/dgroups">) {
  const sp = await searchParams;
  const user = await currentUser();
  const mine = user ? await getMyDgroups(user.id) : [];
  const current = mine.filter((d) => d.status !== "archived");
  const stopped = mine.filter((d) => d.status === "archived");
  const saved = typeof sp.saved === "string" ? mine.find((d) => d.id === sp.saved) : undefined;

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title="Your Dgroups."
        lead="Register the Dgroup you lead so the Centris team knows when and where you meet. Approved groups book Dgroup tables in one tap."
      />
      <Section tone="mist">
        <Container className="max-w-4xl space-y-6">
          {saved ? (
            <p role="status" className="rounded-xl border border-moss/30 bg-moss/10 px-5 py-4 text-ink">
              <span className="font-bold text-moss">✓ Saved.</span>{" "}
              {saved.status === "pending" ? "The team will review it and email you." : "Your Dgroup's details are up to date."}
            </p>
          ) : null}

          {current.length ? (
            <ul className="space-y-4">
              {current.map((d) => {
                const st = DGROUP_STATUS[d.status] ?? DGROUP_STATUS.pending;
                return (
                  <li key={d.id} className="calm-card p-6 sm:p-7">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className={cx("inline-block rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold", TONE[st.tone])}>{st.label}</span>
                        <h2 className="mt-2 text-[1.3rem] font-bold leading-snug text-ink">{d.name}</h2>
                        <p className="mt-1 text-[0.98rem] text-ink-soft">
                          {labelOf(AUDIENCES, d.audience)} · {scheduleText(d)}
                        </p>
                        <p className="text-[0.92rem] text-ink-mute">
                          {d.meets_where === "elsewhere" && d.general_area ? d.general_area : labelOf(WHERE, d.meets_where)} · {d.current_size} in the group ·{" "}
                          {d.is_open ? "open to new members" : "not taking new members"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {d.status === "approved" ? (
                          <ButtonLink href="/reserve/dgroup">Book a table</ButtonLink>
                        ) : null}
                        <ButtonLink href={`/my/dgroups/${d.id}`} tone="outline">
                          {d.status === "changes_requested" ? "Make changes" : "Edit"}
                        </ButtonLink>
                      </div>
                    </div>
                    {d.review_note && (d.status === "changes_requested" || d.status === "declined") ? (
                      <p className="mt-4 rounded-lg bg-sky-wash px-4 py-3 text-[0.95rem] text-ink">
                        <span className="font-semibold">Note from the team:</span> {d.review_note}
                      </p>
                    ) : null}
                    <form action={archiveMyDgroup} className="mt-4 border-t border-rule pt-3">
                      <input type="hidden" name="id" value={d.id} />
                      <button type="submit" className="text-[0.9rem] font-semibold text-ink-mute hover:text-sky">
                        We&rsquo;ve stopped meeting
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="calm-card p-8 text-center sm:p-10">
              <p className="text-[1.3rem] font-bold text-ink">No Dgroups yet</p>
              <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-soft">
                Lead a Dgroup? Register it once: the team will know when and where you meet, and booking a table at Centris becomes one tap.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <ButtonLink href="/my/dgroups/new" size="lg">
              {current.length ? "Register another Dgroup" : "Register your Dgroup"}
            </ButtonLink>
            <p className="text-[0.92rem] text-ink-mute">
              Looking to join a Dgroup instead?{" "}
              <a href={CONNECT_LINKS.dgroupSignup} target="_blank" rel="noreferrer" className="font-semibold text-clay hover:text-clay-deep">
                Sign up with CCF ↗
              </a>
            </p>
          </div>

          {stopped.length ? (
            <p className="text-[0.9rem] text-ink-mute">
              Stopped meeting: {stopped.map((d) => d.name).join(", ")}.{" "}
              <Link href="/contact" className="font-semibold text-clay">
                Started again? Tell us
              </Link>
              .
            </p>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
