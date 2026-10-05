import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section, cx } from "@/components/ui";
import { AnnounceForm, type AnnounceInitial } from "./announce-form";
import { AccessForm } from "./access-form";
import { withdrawAnnouncement } from "@/app/actions/announcements";
import { currentUser, hasAccounts } from "@/lib/auth/session";
import { getMyAnnouncement, getMyAnnouncements, getRepStatus } from "@/lib/queries";
import { manilaDay, manilaMinutesOf } from "@/lib/admin-day";
import { nightLabel } from "@/lib/dgroup-tables";
import type { CcfEvent } from "@/lib/types";

export const metadata: Metadata = {
  title: "Post an announcement",
  description: "For ministry reps: send your event to What's Happening and the screens at CCF Centris.",
};
export const dynamic = "force-dynamic";

const hhmm = (iso: string) => {
  const m = manilaMinutesOf(iso);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

function initialFrom(e: CcfEvent): AnnounceInitial {
  return {
    id: e.id,
    title: e.title,
    ministry: e.ministry ?? undefined,
    category: e.category ?? undefined,
    venue: e.location_note ?? undefined,
    summary: e.summary ?? undefined,
    dates: (e.dates ?? []).map((d) => ({ date: manilaDay(d.starts_at), start: hhmm(d.starts_at), end: hhmm(d.ends_at ?? d.starts_at) })),
    registrationUrl: e.registration_url,
    feeNote: e.fee_note,
    artwork: e.artwork,
  };
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Waiting for review", cls: "bg-clay-wash text-clay-deep" },
  changes_requested: { label: "Changes needed", cls: "bg-sky-wash text-sky" },
  published: { label: "Live", cls: "bg-moss/15 text-moss" },
  declined: { label: "Not posted", cls: "bg-ink/10 text-ink-soft" },
  cancelled: { label: "Withdrawn", cls: "bg-ink/10 text-ink-soft" },
};

/** The one-page SOP, beside the form. */
function Steps() {
  const steps = [
    "Make your artwork in the usual five sizes.",
    "Post at least 10 days before your event.",
    "Upload your files. Main Hall TV is required.",
    "Type the key facts: date, time, place, sign-up link, fee.",
    "You'll get an email within 2 working days.",
  ];
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => (
        <li key={s} className="flex gap-3 text-[0.98rem] leading-relaxed text-ink-soft">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-clay-wash text-[0.85rem] font-bold text-clay-deep">{i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

/**
 * Where ministry reps post announcements for What's Happening and the screens
 * (2026-10-05). Spec: docs/superpowers/specs/2026-10-05-announcements-design.md.
 */
export default async function AnnouncePage({ searchParams }: PageProps<"/announce">) {
  const sp = await searchParams;
  const user = hasAccounts() ? await currentUser() : null;
  const status = user?.email ? await getRepStatus(user.email) : "none";

  let body: React.ReactNode;
  if (!hasAccounts()) {
    body = <p className="calm-card p-8 text-ink-soft">Posting opens when member accounts go live.</p>;
  } else if (!user) {
    body = (
      <div className="calm-card grid gap-6 p-8 sm:p-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="text-[1.4rem] font-bold text-ink">Sign in to post</p>
          <p className="mt-2 leading-relaxed text-ink-soft">Announcements come from approved ministry reps, so start by signing in.</p>
        </div>
        <ButtonLink href="/sign-in?next=/announce" size="lg">
          Sign in
        </ButtonLink>
      </div>
    );
  } else if (status === "none") {
    body = (
      <div className="calm-card p-8 sm:p-10">
        <p className="text-[1.4rem] font-bold text-ink">Ask for access</p>
        <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">
          Posting is for ministry reps. Tell us which ministry you post for, and the team will add you. You&rsquo;ll get an email.
        </p>
        <div className="mt-6">
          <AccessForm />
        </div>
      </div>
    );
  } else if (status === "requested") {
    body = (
      <div className="calm-card p-8 sm:p-10">
        <p className="text-[1.4rem] font-bold text-ink">Your request is in</p>
        <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">
          The team will add you soon and email {user.email}. Then come back here to post.
        </p>
      </div>
    );
  } else {
    const mine = await getMyAnnouncements(user.id);
    const edit = typeof sp.edit === "string" ? await getMyAnnouncement(user.id, sp.edit) : null;
    const showForm = Boolean(edit) || sp.new === "1" || mine.length === 0;
    const now = new Date().toISOString();
    body = showForm ? (
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        <AnnounceForm initial={edit ? initialFrom(edit) : undefined} defaultMinistry={mine[0]?.ministry ?? undefined} />
        <aside className="calm-card p-6 lg:sticky lg:top-24">
          <p className="mb-4 text-[1rem] font-bold text-ink">How it works</p>
          <Steps />
          {mine.length ? (
            <Link href="/announce" className="mt-6 inline-block text-[0.95rem] font-semibold text-clay hover:text-clay-deep">
              ← Your announcements
            </Link>
          ) : null}
        </aside>
      </div>
    ) : (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[1.3rem] font-bold text-ink">Your announcements</h2>
          <ButtonLink href="/announce?new=1" size="lg">
            Post a new announcement
          </ButtonLink>
        </div>
        <ul className="calm-card divide-y divide-rule overflow-hidden">
          {mine.map((e) => {
            const ended = e.status === "published" && (e.ends_at ?? e.starts_at) < now;
            const st = ended ? { label: "Ended", cls: "bg-ink/10 text-ink-soft" } : (STATUS[e.status ?? ""] ?? STATUS.pending);
            const editable = !ended && e.status !== "cancelled" && e.status !== "declined";
            return (
              <li key={e.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <div className="aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-mist sm:w-40">
                  {e.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={cx("inline-block rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold", st.cls)}>{st.label}</span>
                  <p className="mt-1.5 font-bold text-ink">{e.title}</p>
                  <p className="text-[0.9rem] text-ink-mute">
                    {nightLabel(manilaDay(e.starts_at))}
                    {(e.dates?.length ?? 1) > 1 ? ` + ${(e.dates?.length ?? 1) - 1} more` : ""} · {e.location_note}
                  </p>
                  {e.review_note && (e.status === "changes_requested" || e.status === "declined") ? (
                    <p className="mt-2 rounded-lg bg-sky-wash px-3 py-2 text-[0.9rem] text-ink">
                      <span className="font-semibold">Note from the team:</span> {e.review_note}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {e.status === "published" && !ended ? (
                    <Link href={`/events/${e.slug}`} className="text-[0.95rem] font-semibold text-clay hover:text-clay-deep">
                      View
                    </Link>
                  ) : null}
                  {editable ? (
                    <Link href={`/announce?edit=${e.id}`} className="text-[0.95rem] font-semibold text-clay hover:text-clay-deep">
                      {e.status === "changes_requested" ? "Make changes" : "Edit"}
                    </Link>
                  ) : null}
                  {editable ? (
                    <form action={withdrawAnnouncement}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="text-[0.95rem] font-semibold text-ink-mute hover:text-sky">
                        Withdraw
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="calm-card p-6">
          <p className="mb-4 font-bold text-ink">How it works</p>
          <Steps />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="What's Happening"
        title="Post an announcement."
        lead="For ministry reps: one form sends your event to What's Happening and the screens at Centris."
      />
      <Section tone="mist">
        <Container className="max-w-6xl">{body}</Container>
      </Section>
    </>
  );
}
