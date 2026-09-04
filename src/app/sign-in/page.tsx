import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { currentUser } from "@/lib/supabase/ssr";
import { hasSupabase } from "@/lib/supabase/server";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: PageProps<"/sign-in">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const nextParam = one(sp.next);
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/my/reservations";

  if (hasSupabase() && (await currentUser())) redirect(next);

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Sign in to CCF Centris."
        lead="Reserving a court or a room needs an account, so you can see your bookings and cancel if plans change. No password — we email you a link."
      />
      <Section>
        <Container className="max-w-md">
          {one(sp.error) === "link" ? (
            <p className="mb-6 border border-clay bg-clay/8 px-4 py-3 text-[0.85rem] font-semibold text-clay-deep">
              That sign-in link didn&rsquo;t work. It may have expired or already
              been used — request a fresh one.
            </p>
          ) : null}
          <SignInForm next={next} />
        </Container>
      </Section>
    </>
  );
}
