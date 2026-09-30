import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FormNote } from "@/components/auth-fields";
import { Container, Section } from "@/components/ui";
import { currentUser, hasAccounts } from "@/lib/auth/session";
import { safeNext } from "@/lib/prayer-wall";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Sign up: name, email and a password, or Google (2026-09-30). */
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNext(one(sp.next), "/my/reservations");

  if (await currentUser()) redirect(next);
  const accounts = hasAccounts();

  return (
    <Section tone="mist" className="pt-10! sm:pt-16!">
      <Container className="max-w-md">
        <div className="calm-card px-6 py-9 sm:px-10 sm:py-11">
          <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">Create your account</h1>
          <p className="mt-2 text-[1rem] leading-relaxed text-ink-mute">
            One account for booking tables and rooms, and for the Prayer Wall.
          </p>
          {!accounts ? (
            <div className="mt-6">
              <FormNote>Accounts open soon. Check back in a little while.</FormNote>
            </div>
          ) : null}
          <div className="mt-7">
            <SignUpForm next={next} accounts={accounts} />
          </div>
        </div>
        <p className="mt-6 text-center text-[0.9rem] leading-relaxed text-ink-mute">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="font-semibold text-clay hover:underline">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-clay hover:underline">
            privacy policy
          </Link>
          .
        </p>
      </Container>
    </Section>
  );
}
