import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth-layout";
import { safeNext } from "@/lib/prayer-wall";
import { splitName } from "@/lib/member";
import { currentUser } from "@/lib/auth/session";
import { getMemberProfile } from "@/lib/auth/profile";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Finish setting up", robots: { index: false } };

/**
 * Asked once, straight after a member's first sign-in (see `startSession`):
 * first name, surname and mobile number. Prefilled from
 * whatever the sign-in provider shared, for the member to confirm. The /my
 * layout already requires a session.
 */
export default async function SetupPage({ searchParams }: PageProps<"/my/setup">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next, "/my/reservations");
  const user = await currentUser();
  const profile = user ? await getMemberProfile(user.id) : null;
  const guess = splitName(profile?.full_name);

  return (
    <AuthLayout
      eyebrow="Almost there"
      title="Tell us about you."
      lead="Your name and mobile number help the CCF Centris team confirm your bookings. Other members never see them."
    >
      <h2 className="text-[1.35rem] font-semibold tracking-[-0.01em] text-ink">About you</h2>
      <div className="mt-6">
        <SetupForm
          next={next}
          email={user?.email ?? ""}
          first={profile?.first_name ?? guess.first}
          last={profile?.last_name ?? guess.last}
          mobile={profile?.mobile ?? ""}
        />
      </div>
    </AuthLayout>
  );
}
