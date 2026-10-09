import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { getMyContact } from "@/lib/queries";
import { DgroupForm } from "../dgroup-form";

export const metadata: Metadata = { title: "Register your Dgroup" };
export const dynamic = "force-dynamic";

/** Register a Dgroup (2026-10-08). The /my layout already requires a session. */
export default async function NewDgroupPage() {
  const contact = await getMyContact();
  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title="Register your Dgroup."
        lead="Let the Centris team know about the Dgroup you lead. Once it's approved, booking a Dgroup table takes one tap."
      />
      <Section tone="mist">
        <Container className="max-w-3xl">
          <Link href="/my/dgroups" className="mb-3 inline-flex min-h-10 items-center text-[0.95rem] font-semibold text-clay hover:text-clay-deep">
            ← Your Dgroups
          </Link>
          <DgroupForm initial={{ leaderName: contact?.name ?? "", leaderMobile: contact?.mobile ?? "" }} />
        </Container>
      </Section>
    </>
  );
}
