import type { Metadata } from "next";
import { EmbeddedPage } from "@/components/embedded-page";
import { CCF_POLICIES } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "CCF's terms and conditions, which cover CCF Centris and this site.",
};

/** CCF Main's terms and conditions, which cover CCF Centris (Ralph, 2026-10-10). */
export default function TermsPage() {
  return (
    <EmbeddedPage
      eyebrow="Terms"
      title="Terms and conditions"
      lead="CCF Centris follows Christ's Commission Fellowship's terms and conditions."
      src={CCF_POLICIES.terms}
      frameTitle="CCF terms and conditions"
    />
  );
}
