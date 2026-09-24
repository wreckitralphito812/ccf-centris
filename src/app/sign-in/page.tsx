import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { currentUser } from "@/lib/supabase/ssr";
import { enabledAuthProviders } from "@/lib/supabase/providers";
import { hasSupabase } from "@/lib/supabase/server";
import { ProviderButton } from "./provider-button";
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

  const providers = await enabledAuthProviders();

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Sign in to CCF Centris."
        lead="With an account you can book and manage Dgroup tables and post on the Prayer Wall. There's no password to remember."
      />
      <Section>
        <Container className="max-w-md">
          {one(sp.error) === "link" ? (
            <p className="mb-6 border border-clay bg-clay/8 px-4 py-3 text-[0.85rem] font-semibold text-clay-deep">
              That sign-in link didn&rsquo;t work. It may have expired or already
              been used, so please request a new one.
            </p>
          ) : null}
          {/* Each provider is only offered when the project actually has it
              switched on. Otherwise the button is a dead end: Supabase answers
              "Unsupported provider: provider is not enabled". */}
          {providers.google || providers.facebook ? (
            <>
              <div className="grid gap-3">
                {providers.google ? <ProviderButton provider="google" next={next} /> : null}
                {providers.facebook ? <ProviderButton provider="facebook" next={next} /> : null}
              </div>
              <div className="my-6 flex items-center gap-4">
                <span className="h-px flex-1 bg-hairline" />
                <span className="label text-ink-mute">or with your email</span>
                <span className="h-px flex-1 bg-hairline" />
              </div>
            </>
          ) : null}
          <SignInForm next={next} />
        </Container>
      </Section>
    </>
  );
}
