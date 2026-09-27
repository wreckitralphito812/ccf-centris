import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Container, Section } from "@/components/ui";
import { currentUser, hasAccounts } from "@/lib/auth/session";
import { safeNext } from "@/lib/prayer-wall";
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
  const next = safeNext(one(sp.next), "/my/reservations");

  if (await currentUser()) redirect(next);

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
          {hasAccounts() ? (
            <>
              <ProviderButton next={next} />
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
