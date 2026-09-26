import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Eyebrow, Section, SectionHead } from "@/components/ui";
import { currentUser, createSupabaseServer } from "@/lib/supabase/ssr";
import { hasSupabase } from "@/lib/supabase/server";
import { manilaDateKey } from "@/lib/format";
import { HOURS_SUMMARY, MINISTRY_ROOMS, SETUPS } from "@/lib/ministry-rooms";
import { BookingFlow } from "./booking";
import { ROOM_POLICIES } from "./policies";

export const metadata: Metadata = {
  title: "Request a room",
  description:
    "Request a room at CCF Centris for ministry meetings, trainings and events. Rooms are free, and the facilities team confirms each request.",
};

/** Sign-in state and today's date change per request, so never cache. */
export const dynamic = "force-dynamic";

export default async function ReservePage() {
  const user = hasSupabase() ? await currentUser() : null;

  let name = "";
  let mobile = "";
  if (user) {
    const { data: profile } = await (await createSupabaseServer())
      .from("profiles")
      .select("first_name, last_name, full_name, mobile")
      .eq("id", user.id)
      .maybeSingle();
    name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.full_name || "";
    mobile = profile?.mobile ?? "";
  }

  return (
    <>
      <PageHeader
        eyebrow="Reserve"
        title="Request a room."
        lead="For ministry meetings, trainings and events. Rooms are free. Send a request and the facilities team will confirm it by email."
      />

      <Section>
        <Container>
          {user?.email ? (
            <BookingFlow today={manilaDateKey()} name={name} email={user.email} mobile={mobile} />
          ) : (
            <div className="grid gap-8 border border-hairline bg-paper-bright p-7 sm:p-9 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <Eyebrow>Sign in to request</Eyebrow>
                <p className="font-display mt-3 text-2xl leading-tight text-ink sm:text-3xl">
                  Requests come from a signed-in account.
                </p>
                <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">
                  So each request has a real name and email, and we can confirm the room with you. There&rsquo;s no
                  password: we email you a link.
                </p>
              </div>
              <ButtonLink href="/sign-in?next=/centris/reserve" size="lg">
                Sign in to continue
              </ButtonLink>
            </div>
          )}
        </Container>
      </Section>

      <Section tone="deep">
        <Container>
          <SectionHead eyebrow="Rooms" title="Rooms and hours" />
          <div className="mt-8 grid gap-10 lg:grid-cols-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] border-y border-hairline text-left text-[0.95rem]">
                <thead>
                  <tr className="border-b border-hairline">
                    <th className="label py-3 pr-4 font-normal text-ink-mute">Room</th>
                    {SETUPS.map((s) => (
                      <th key={s.id} className="label py-3 pr-4 text-right font-normal text-ink-mute">
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {MINISTRY_ROOMS.map((r) => (
                    <tr key={r.slug}>
                      <td className="py-3 pr-4 font-semibold text-ink">{r.name}</td>
                      {SETUPS.map((s) => (
                        <td key={s.id} className="py-3 pr-4 text-right tabular-nums text-ink-soft">
                          {r.capacity[s.id] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[0.85rem] text-ink-mute">People per set-up.</p>
            </div>
            <ul className="divide-y divide-hairline border-y border-hairline">
              {HOURS_SUMMARY.map(([t, b]) => (
                <li key={t} className="py-3">
                  <span className="block font-semibold text-ink">{t}</span>
                  <span className="mt-0.5 block leading-relaxed text-ink-soft">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      {user ? null : (
        <Section id="policies" className="scroll-mt-24">
          <Container>
            <SectionHead eyebrow="Policies" title="Room policies" />
            <ul className="mt-8 divide-y divide-hairline border-y border-hairline">
              {ROOM_POLICIES.map(([t, b]) => (
                <li key={t} className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
                  <span className="font-semibold text-ink">{t}</span>
                  <span className="leading-relaxed text-ink-soft">{b}</span>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      )}
    </>
  );
}
