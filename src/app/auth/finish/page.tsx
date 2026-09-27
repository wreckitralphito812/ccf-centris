import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { safeNext } from "@/lib/prayer-wall";
import { FinishSignIn } from "./finish-sign-in";

export const metadata: Metadata = {
  title: "Signing in",
  robots: { index: false, follow: false },
};

/**
 * Where the emailed sign-in link lands. Firebase appends the one-time code to
 * this URL; the browser redeems it and hands the result to the server.
 */
export default async function FinishPage({ searchParams }: PageProps<"/auth/finish">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next, "/my/reservations");

  return (
    <>
      <PageHeader eyebrow="Account" title="Signing you in." />
      <Section>
        <Container className="max-w-md">
          <FinishSignIn next={next} />
        </Container>
      </Section>
    </>
  );
}
