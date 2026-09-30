import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormNote } from "@/components/auth-fields";
import { Container, Section } from "@/components/ui";
import { currentUser, hasAccounts } from "@/lib/auth/session";
import { safeNext } from "@/lib/prayer-wall";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Sign in: one calm card with email and password, then Google (2026-09-30). */
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNext(one(sp.next), "/my/reservations");

  if (await currentUser()) redirect(next);
  const accounts = hasAccounts();

  return (
    <Section tone="mist" className="pt-10! sm:pt-16!">
      <Container className="max-w-md">
        <div className="calm-card px-6 py-9 sm:px-10 sm:py-11">
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">Sign in</h1>
          <p className="mt-2 text-[1rem] leading-relaxed text-ink-mute">
            Book and manage Dgroup tables and rooms, and post on the Prayer Wall.
          </p>
          <div className="mt-7 space-y-4">
            {one(sp.verified) ? (
              <FormNote tone="ok">Your email is confirmed. Sign in to continue.</FormNote>
            ) : null}
            {one(sp.error) === "link" ? (
              <FormNote>That link didn&rsquo;t work. It may have expired, so please sign in again.</FormNote>
            ) : null}
            {!accounts ? <FormNote>Accounts open soon. Check back in a little while.</FormNote> : null}
          </div>
          <div className="mt-6">
            <SignInForm next={next} accounts={accounts} />
          </div>
        </div>
      </Container>
    </Section>
  );
}
