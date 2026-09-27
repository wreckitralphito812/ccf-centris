import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { safeNext } from "@/lib/prayer-wall";
import { splitName } from "@/lib/member";
import { currentUser } from "@/lib/auth/session";
import { getMemberProfile } from "@/lib/auth/profile";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Finish setting up", robots: { index: false } };

/**
 * Asked once, straight after a member's first sign-in (see `startSession`):
 * first name, surname, and a screen name for the Prayer Wall. Prefilled from
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
    <>
      <PageHeader
        eyebrow="Your account"
        title="Finish setting up."
        lead="Tell us your name so the CCF Centris team knows who's who. It stays private: other members only ever see your screen name."
      />
      <Section>
        <Container>
          <SetupForm
            next={next}
            email={user?.email ?? ""}
            first={profile?.first_name ?? guess.first}
            last={profile?.last_name ?? guess.last}
            screen={profile?.screen_name ?? ""}
          />
        </Container>
      </Section>
    </>
  );
}
