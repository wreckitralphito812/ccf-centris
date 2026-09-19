import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { safeNext } from "@/lib/prayer-wall";
import { splitName } from "@/lib/member";
import { createSupabaseServer } from "@/lib/supabase/ssr";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Finish setting up", robots: { index: false } };

/**
 * Asked once, straight after a member's first sign-in (see auth/callback):
 * first name, surname, and a screen name for the Prayer Wall. Prefilled from
 * whatever the sign-in provider shared, for the member to confirm. The /my
 * layout already requires a session.
 */
export default async function SetupPage({ searchParams }: PageProps<"/my/setup">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next, "/my/reservations");
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { data: screen }] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name, full_name").eq("id", user?.id ?? "").maybeSingle(),
    supabase.rpc("my_screen_name"),
  ]);

  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const guess = splitName(profile?.full_name ?? meta.full_name ?? meta.name);

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
            screen={typeof screen === "string" ? screen : ""}
          />
        </Container>
      </Section>
    </>
  );
}
