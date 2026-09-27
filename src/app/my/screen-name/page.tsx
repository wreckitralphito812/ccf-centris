import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { safeNext } from "@/lib/prayer-wall";
import { currentUser } from "@/lib/auth/session";
import { getMemberProfile } from "@/lib/auth/profile";
import { ScreenNameForm } from "./screen-name-form";

export const metadata: Metadata = { title: "Your screen name" };

/**
 * Where members choose the name the Prayer Wall shows instead of their real
 * one. New members land here straight after their first sign-in (see
 * `startSession`). The /my layout already requires a session.
 */
export default async function ScreenNamePage({ searchParams }: PageProps<"/my/screen-name">) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next, "/prayer-wall");
  const user = await currentUser();
  const name = (user && (await getMemberProfile(user.id))?.screen_name) || "";

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title={name ? "Change your screen name." : "Choose a screen name."}
        lead="This is the name other members see beside your prayer requests, prayers, and messages. It doesn't need to be your real name."
      />
      <Section>
        <Container>
          <ScreenNameForm next={next} current={name} />
        </Container>
      </Section>
    </>
  );
}
