import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader, AdminNote, AdminPanel } from "../admin-ui";
import { AddRepForm, ReviewActions, TakeDown } from "./review-forms";
import { redirect } from "next/navigation";
import { approveAnnouncementRep, removeAnnouncementRep } from "@/app/actions/admin-announcements";
import { cx } from "@/components/ui";
import { getAnnouncementQueue, getAnnouncementReps } from "@/lib/queries";
import { requireAdmin } from "@/lib/admin-auth";
import { hasSupabase } from "@/lib/supabase/server";
import { Files, Review, when } from "./parts";
import { manilaDay } from "@/lib/admin-day";
import { nightLabel } from "@/lib/dgroup-tables";
import type { CcfEvent } from "@/lib/types";

export const metadata: Metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

const TABS = [
  { id: "waiting", label: "Waiting" },
  { id: "live", label: "Live" },
  { id: "screens", label: "Screens" },
  { id: "reps", label: "Reps" },
  { id: "past", label: "Past" },
] as const;

/**
 * The announcements queue (2026-10-05), replacing the template's demo banner
 * page. Ministry reps submit at /announce; here the team approves, sends back
 * or declines, sees what's live, downloads screen files, and manages reps.
 */
export default async function AdminAnnouncements({ searchParams }: PageProps<"/admin/announcements">) {
  const { readOnly: noCode } = await requireAdmin();
  const readOnly = noCode || !hasSupabase();
  const sp = await searchParams;
  // Adding and editing events moved to /admin/events (2026-10-08).
  if (typeof sp.edit === "string") redirect(`/admin/events/${sp.edit}`);
  if (sp.tab === "new") redirect("/admin/events/new");
  const [queue, reps] = await Promise.all([getAnnouncementQueue(), getAnnouncementReps()]);
  const tab = TABS.find((t) => t.id === sp.tab)?.id ?? "waiting";

  const now = new Date();
  const nowIso = now.toISOString();
  const endOf = (e: CcfEvent) => e.ends_at ?? e.starts_at;
  const waiting = queue.filter((e) => e.status === "pending");
  const sentBack = queue.filter((e) => e.status === "changes_requested");
  const live = queue.filter((e) => e.status === "published" && endOf(e) >= nowIso);
  const past = queue.filter((e) => !["pending", "changes_requested"].includes(e.status ?? "") && !(e.status === "published" && endOf(e) >= nowIso));
  const soon = new Date(now.getTime() + 14 * 86_400_000).toISOString();
  const screens = live.filter((e) => (e.dates ?? []).some((d) => d.starts_at <= soon));
  const requests = reps.filter((r) => !r.approved_at);
  const approved = reps.filter((r) => r.approved_at);

  const count: Record<string, number> = { waiting: waiting.length, live: live.length, screens: screens.length, reps: requests.length, past: past.length };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Announcements"
        lead="Ministry reps post at /announce. Approve to publish on What's Happening; it comes down after its last date."
        action={
          <Link href="/admin/events" className="inline-flex min-h-11 items-center rounded-lg border border-edge bg-paper-bright px-4 font-semibold text-ink hover:border-clay">
            Manage events →
          </Link>
        }
      />
      {!hasSupabase() ? <AdminNote>Not connected to a database.</AdminNote> : null}

      <nav className="flex flex-wrap gap-1 rounded-lg border border-edge bg-paper-bright p-1" aria-label="Announcements">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/announcements?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cx(
              "inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-[0.95rem] font-semibold",
              tab === t.id ? "bg-clay text-paper-bright" : "text-ink-soft hover:bg-mist",
            )}
          >
            {t.label}
            {count[t.id] ? (
              <span className={cx("rounded-full px-2 text-[0.78rem]", tab === t.id ? "bg-paper-bright/25" : "bg-clay-wash text-clay-deep")}>
                {count[t.id]}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>

      {tab === "waiting" ? (
        <>
          <AdminPanel title="Waiting for review">
            {waiting.length ? (
              <div className="divide-y divide-rule">
                {waiting.map((e) => (
                  <Review key={e.id} e={e}>
                    {readOnly ? <p className="label text-ink-mute">Read-only</p> : <ReviewActions id={e.id} />}
                  </Review>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">Nothing waiting.</p>
            )}
          </AdminPanel>
          {sentBack.length ? (
            <AdminPanel title="Sent back for changes">
              <ul className="divide-y divide-rule">
                {sentBack.map((e) => (
                  <li key={e.id} className="px-5 py-3.5 text-[0.92rem]">
                    <span className="font-semibold text-ink">{e.title}</span>
                    <span className="text-ink-mute"> · {e.ministry} · note: {e.review_note}</span>
                  </li>
                ))}
              </ul>
            </AdminPanel>
          ) : null}
        </>
      ) : null}

      {tab === "live" ? (
        <AdminPanel title="Live on What's Happening">
          {live.length ? (
            <div className="divide-y divide-rule">
              {live.map((e) => (
                <Review key={e.id} e={e}>
                  <div className="flex flex-wrap gap-4">
                    {e.calendar_only ? (
                      <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-[0.8rem] font-semibold text-ink-soft">Calendar only</span>
                    ) : (
                      <Link href={`/events/${e.slug}`} className="label text-clay">
                        View on site
                      </Link>
                    )}
                    {readOnly ? null : (
                      <Link href={`/admin/events/${e.id}`} className="label text-clay">
                        Edit
                      </Link>
                    )}
                    {readOnly ? null : <TakeDown id={e.id} />}
                  </div>
                </Review>
              ))}
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">Nothing live.</p>
          )}
        </AdminPanel>
      ) : null}

      {tab === "screens" ? (
        <AdminPanel title="For the screens · next two weeks">
          {screens.length ? (
            <ul className="divide-y divide-rule">
              {screens.map((e) => (
                <li key={e.id} className="space-y-2.5 px-5 py-4">
                  <p>
                    <span className="font-semibold text-ink">{e.title}</span>
                    <span className="text-[0.9rem] text-ink-mute"> · {when(e)}</span>
                  </p>
                  <Files e={e} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">Nothing coming up in the next two weeks.</p>
          )}
        </AdminPanel>
      ) : null}

      {tab === "reps" ? (
        <>
          {requests.length ? (
            <AdminPanel title="Asking for access">
              <ul className="divide-y divide-rule">
                {requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-[0.92rem]">
                    <span>
                      <span className="font-semibold text-ink">{r.name ?? r.email}</span>
                      <span className="text-ink-mute">
                        {" "}
                        · {r.email}
                        {r.ministry ? ` · ${r.ministry}` : ""}
                      </span>
                    </span>
                    {readOnly ? null : (
                      <span className="flex gap-4">
                        <form action={approveAnnouncementRep}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="label text-clay hover:text-clay-deep">
                            Approve
                          </button>
                        </form>
                        <form action={removeAnnouncementRep}>
                          <input type="hidden" name="id" value={r.id} />
                          <button type="submit" className="label text-ink-mute hover:text-sky">
                            Turn down
                          </button>
                        </form>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </AdminPanel>
          ) : null}
          <AdminPanel title="Add a rep">{readOnly ? <p className="px-5 py-4 text-ink-mute">Read-only</p> : <AddRepForm />}</AdminPanel>
          <AdminPanel title={`Approved reps · ${approved.length}`}>
            {approved.length ? (
              <ul className="divide-y divide-rule">
                {approved.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-[0.92rem]">
                    <span>
                      <span className="font-semibold text-ink">{r.name ?? r.email}</span>
                      <span className="text-ink-mute">
                        {" "}
                        · {r.email}
                        {r.ministry ? ` · ${r.ministry}` : ""}
                      </span>
                    </span>
                    {readOnly ? null : (
                      <form action={removeAnnouncementRep}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="label text-ink-mute hover:text-sky">
                          Remove
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">No reps yet. Add one above.</p>
            )}
          </AdminPanel>
        </>
      ) : null}

      {tab === "past" ? (
        <AdminPanel title="Ended, declined or withdrawn">
          {past.length ? (
            <ul className="divide-y divide-rule">
              {past.map((e) => (
                <li key={e.id} className="px-5 py-3.5 text-[0.92rem]">
                  <span className="font-semibold text-ink">{e.title}</span>
                  <span className="text-ink-mute">
                    {" "}
                    · {e.ministry} · {nightLabel(manilaDay(e.starts_at))} ·{" "}
                    {e.status === "published" ? "ended" : e.status === "cancelled" ? "withdrawn or taken down" : e.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">Nothing yet.</p>
          )}
        </AdminPanel>
      ) : null}
    </div>
  );
}
