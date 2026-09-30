import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FormNote } from "@/components/auth-fields";
import { AuthLayout } from "@/components/auth-layout";
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
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to CCF Centris."
      lead="Your account keeps your bookings and your Prayer Wall posts together."
    >
      <h2 className="text-[1.35rem] font-semibold tracking-[-0.01em] text-ink">Sign in</h2>
      {one(sp.verified) || one(sp.error) === "link" || !accounts ? (
        <div className="mt-5 space-y-3">
          {one(sp.verified) ? <FormNote tone="ok">Your email is confirmed. Sign in to continue.</FormNote> : null}
          {one(sp.error) === "link" ? (
            <FormNote>That link didn&rsquo;t work. It may have expired, so please sign in again.</FormNote>
          ) : null}
          {!accounts ? <FormNote tone="info">Accounts open soon. Check back in a little while.</FormNote> : null}
        </div>
      ) : null}
      <div className="mt-6">
        <SignInForm next={next} accounts={accounts} />
      </div>
    </AuthLayout>
  );
}
