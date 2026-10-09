import { noticeLayout } from "@/lib/emails/announcement";

/**
 * Emails for the Dgroup registry (2026-10-08): to the team when a leader
 * registers a Dgroup, and to the leader when the team decides. Same plain
 * layout as the announcement emails.
 */

export function adminDgroupEmail(d: { origin: string; name: string; leader: string; schedule: string }) {
  return {
    subject: `Dgroup waiting for approval: ${d.name}`,
    ...noticeLayout({
      origin: d.origin,
      eyebrow: "Dgroups",
      headline: "A Dgroup is waiting for approval.",
      paragraphs: [`"${d.name}", led by ${d.leader}${d.schedule ? `, meets ${d.schedule}` : ""}.`],
      button: { label: "Review it", href: `${d.origin}/admin/dgroups` },
    }),
  };
}

export type DgroupDecision = "approved" | "changes" | "declined";

export function dgroupDecisionEmail(d: { kind: DgroupDecision; origin: string; name: string; note?: string | null }) {
  const copy = {
    approved: {
      subject: `Approved: ${d.name}`,
      headline: "Your Dgroup is registered.",
      paragraphs: [
        `"${d.name}" is now registered with CCF Centris. Thank you for leading.`,
        "When you book a Dgroup table, pick your group and the details fill in for you.",
      ],
      button: { label: "Book a table", href: `${d.origin}/reserve/dgroup` },
    },
    changes: {
      subject: `A few changes, please: ${d.name}`,
      headline: "A few changes, please.",
      paragraphs: [`"${d.name}" needs a few changes before it can be approved. The note from the team:`],
      button: { label: "Make the changes", href: `${d.origin}/my/dgroups` },
    },
    declined: {
      subject: `Not approved: ${d.name}`,
      headline: "We couldn't approve this one.",
      paragraphs: [`"${d.name}" wasn't approved. The note from the team:`],
      button: { label: "See your Dgroups", href: `${d.origin}/my/dgroups` },
    },
  }[d.kind];
  return {
    subject: copy.subject,
    ...noticeLayout({ origin: d.origin, eyebrow: "Dgroups", headline: copy.headline, paragraphs: copy.paragraphs, note: d.note, button: copy.button }),
  };
}
