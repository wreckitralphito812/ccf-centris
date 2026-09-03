import type { Metadata } from "next";
import { AdminHeader, AdminNote, AdminPanel, Stat, Status } from "../admin-ui";

export const metadata: Metadata = { title: "Pastoral requests" };

/** Pastoral care only. Not visible to any administrative role. */
const REQUESTS = [
  {
    id: "c1",
    kind: "I want to know Jesus",
    name: "Alwin M.",
    when: "3 hours ago",
    contact: "Email",
    note: "Came to the sports hall for pickleball, started asking questions after.",
    status: "new",
  },
  {
    id: "c2",
    kind: "I need pastoral support",
    name: "Withheld at request",
    when: "Yesterday",
    contact: "Phone",
    note: "Bereavement. Asked specifically for someone who has been through it.",
    status: "assigned",
  },
  {
    id: "c3",
    kind: "I need counselling information",
    name: "Ferdie C.",
    when: "2 days ago",
    contact: "Email",
    note: "Looking for professional referral options rather than church counselling.",
    status: "in_progress",
  },
  {
    id: "c4",
    kind: "I want someone to contact me",
    name: "Divine P.",
    when: "4 days ago",
    contact: "Phone",
    note: "First-time visitor, wanted to talk before coming again.",
    status: "closed",
  },
];

export default function AdminPastoral() {
  const open = REQUESTS.filter((r) => r.status !== "closed");

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Pastoral requests"
        lead="Pastoral care team only. Nothing here is visible to administrative roles."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Open" value={open.length} tone="clay" />
        <Stat label="Awaiting first contact" value={1} tone="clay" note="Oldest is 3 hours" />
        <Stat label="Closed this month" value={9} />
      </div>

      <AdminPanel title="Queue">
        <ul className="divide-y divide-hairline">
          {REQUESTS.map((r) => (
            <li key={r.id} className="p-5">
              <div className="flex flex-wrap items-center gap-3">
                <Status value={r.status.replace("_", " ")} />
                <span className="label text-clay">{r.kind}</span>
                <span className="text-[0.88rem] font-semibold">{r.name}</span>
                <span className="label border border-ink/20 px-2 py-1 text-ink-mute">
                  Contact by {r.contact}
                </span>
                <span className="label ml-auto text-ink-mute">{r.when}</span>
              </div>
              <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">
                {r.note}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {["Assign", "Log contact", "Refer", "Close"].map((a) => (
                  <span
                    key={a}
                    className="label border border-ink/20 px-2.5 py-1.5 text-ink-mute"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminNote>
        Pastoral notes are confidential. They are not exported, not included in
        analytics, and not visible to satellite, events, or facilities
        administrators. Where someone is at risk of serious harm, the team has a
        duty to act, and that is stated plainly to people when they write in.
      </AdminNote>
    </div>
  );
}
