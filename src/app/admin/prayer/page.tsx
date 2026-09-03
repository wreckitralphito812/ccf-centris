import type { Metadata } from "next";
import { AdminHeader, AdminNote, AdminPanel, Stat, Status } from "../admin-ui";

export const metadata: Metadata = { title: "Prayer requests" };

/**
 * Prayer queue.
 *
 * The most restricted screen in the console. Only the prayer team and
 * pastoral care roles reach it, enforced by row-level security rather than
 * by hiding a nav link. Anonymous requests carry no identity at all, and the
 * interface shows that plainly so nobody assumes a name is being withheld
 * from them by accident.
 */

const REQUESTS = [
  {
    id: "p1",
    when: "2 hours ago",
    anonymous: true,
    name: null,
    category: "Health",
    body: "My mother's results come back on Friday. I have not told anyone at church and I do not want to talk about it, I just want someone to pray.",
    followUp: false,
    status: "new",
  },
  {
    id: "p2",
    when: "Yesterday",
    anonymous: false,
    name: "Marites R.",
    category: "Work",
    body: "Third month without steady work. Trying not to panic in front of the kids.",
    followUp: true,
    status: "assigned",
  },
  {
    id: "p3",
    when: "2 days ago",
    anonymous: true,
    name: null,
    category: "Spiritual",
    body: "I have been coming for a year and I still do not know if I believe any of it. Please pray I would be honest with myself.",
    followUp: false,
    status: "new",
  },
  {
    id: "p4",
    when: "3 days ago",
    anonymous: false,
    name: "Joel A.",
    category: "Family",
    body: "My brother and I have not spoken since our father died. Praying for the courage to call him.",
    followUp: true,
    status: "in_progress",
  },
];

export default function AdminPrayer() {
  const anon = REQUESTS.filter((r) => r.anonymous).length;
  const wantsContact = REQUESTS.filter((r) => r.followUp).length;

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Prayer requests"
        lead="Visible to the prayer team and pastoral care only. Never published, never read aloud without permission."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="New this week" value={REQUESTS.length} tone="clay" />
        <Stat label="Sent anonymously" value={anon} note="No identity held at all" />
        <Stat label="Asked to be contacted" value={wantsContact} tone="moss" />
      </div>

      <AdminPanel title="Queue">
        <ul className="divide-y divide-hairline">
          {REQUESTS.map((r) => (
            <li key={r.id} className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Status value={r.status.replace("_", " ")} />
                <span className="label text-ink-mute">{r.category}</span>
                {r.anonymous ? (
                  <span className="label border border-ink/20 px-2 py-1 text-ink-mute">
                    Anonymous
                  </span>
                ) : (
                  <span className="text-[0.88rem] font-semibold">{r.name}</span>
                )}
                {r.followUp ? (
                  <span className="label border border-clay/40 bg-clay/10 px-2 py-1 text-clay-deep">
                    Wants contact
                  </span>
                ) : null}
                <span className="label ml-auto text-ink-mute">{r.when}</span>
              </div>

              <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">
                {r.body}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {(r.anonymous
                  ? ["Mark as prayed for", "Assign", "Close"]
                  : r.followUp
                    ? ["Assign to pastor", "Mark contacted", "Mark as prayed for", "Close"]
                    : ["Mark as prayed for", "Assign", "Close"]
                ).map((a) => (
                  <span
                    key={a}
                    className="label border border-ink/20 px-2.5 py-1.5 text-ink-mute"
                  >
                    {a}
                  </span>
                ))}
              </div>

              {r.anonymous ? (
                <p className="mt-3 text-[0.8rem] text-ink-mute">
                  This request carries no name, email, or account link. There is
                  no way to reply to it, by design.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminNote>
        Access to this screen is enforced in the database, not the interface.
        Only the prayer team, pastoral care, and super administrator roles can
        read these rows. A satellite administrator, events administrator, or
        facilities administrator cannot, even with a direct link.
      </AdminNote>
    </div>
  );
}
