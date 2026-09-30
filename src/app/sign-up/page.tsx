import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FormNote } from "@/components/auth-fields";
import { AuthLayout } from "@/components/auth-layout";
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
    <AuthLayout
      eyebrow="Join CCF Centris"
      title="Create your account."
      lead="One account for booking tables and rooms, and for the Prayer Wall. It takes a minute."
    >
      <h2 className="text-[1.35rem] font-semibold tracking-[-0.01em] text-ink">Create account</h2>
      {!accounts ? (
        <div className="mt-5">
          <FormNote tone="info">Accounts open soon. Check back in a little while.</FormNote>
        </div>
      ) : null}
      <div className="mt-6">
        <SignUpForm next={next} accounts={accounts} />
      </div>
      <p className="mt-6 border-t border-rule pt-5 text-center text-[0.88rem] leading-relaxed text-ink-mute">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="font-medium text-clay hover:underline">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-clay hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </AuthLayout>
  );
}
