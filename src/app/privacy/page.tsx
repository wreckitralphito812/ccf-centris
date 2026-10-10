import type { Metadata } from "next";
import { EmbeddedPage } from "@/components/embedded-page";
import { CCF_POLICIES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "CCF's privacy policy, which covers CCF Centris: what is collected, why, and how it's protected.",
};

/** CCF Main's privacy policy, which covers CCF Centris (Ralph, 2026-10-10). */
export default function PrivacyPage() {
  return (
    <EmbeddedPage
      eyebrow="Privacy"
      title="Privacy policy"
      lead="CCF Centris follows Christ's Commission Fellowship's privacy policy."
      src={CCF_POLICIES.privacy}
      frameTitle="CCF privacy policy"
    />
  );
}
