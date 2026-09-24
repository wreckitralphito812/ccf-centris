import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <PageHeader
      eyebrow="Page not found"
      title="We couldn’t find that page."
      lead="The link may be old, or the page may have moved. These will get you where you’re going."
      actions={
        <>
          <ButtonLink href="/" size="lg">
            Go to the homepage
          </ButtonLink>
          <ButtonLink href="/visit" tone="outline" size="lg">
            Getting here
          </ButtonLink>
          <ButtonLink href="/contact" tone="outline" size="lg">
            Contact us
          </ButtonLink>
        </>
      }
    />
  );
}
