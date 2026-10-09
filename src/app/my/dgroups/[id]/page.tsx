import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { currentUser } from "@/lib/auth/session";
import { getMyDgroup } from "@/lib/queries";
import { DgroupForm } from "../dgroup-form";
import { initialFrom } from "../initial";

export const metadata: Metadata = { title: "Edit your Dgroup" };
export const dynamic = "force-dynamic";

/** Edit one of this member's Dgroups (2026-10-08). */
export default async function EditDgroupPage({ params }: PageProps<"/my/dgroups/[id]">) {
  const { id } = await params;
  const user = await currentUser();
  const d = user ? await getMyDgroup(user.id, id) : null;
  if (!d) notFound();
  return (
    <>
      <PageHeader eyebrow="Your Dgroups" title={d.name} lead="Keep your Dgroup's details current, so the team knows when and where you meet." />
      <Section tone="mist">
        <Container className="max-w-3xl">
          <Link href="/my/dgroups" className="mb-3 inline-flex min-h-10 items-center text-[0.95rem] font-semibold text-clay hover:text-clay-deep">
            ← Your Dgroups
          </Link>
          {d.review_note && (d.status === "changes_requested" || d.status === "declined") ? (
            <p className="mb-5 rounded-xl bg-sky-wash px-5 py-4 text-ink">
              <span className="font-semibold">Note from the team:</span> {d.review_note}
            </p>
          ) : null}
          <DgroupForm initial={initialFrom(d)} />
        </Container>
      </Section>
    </>
  );
}
