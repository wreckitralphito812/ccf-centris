import { Container, Section } from "./ui";

/**
 * The instant placeholder for pages that wait on the database (loading.tsx).
 * It mirrors a PageHeader and a few surfaces, so the page's frame appears the
 * moment someone taps, and the real content swaps in without a jump.
 * Announced once to screen readers; the shapes themselves are hidden.
 */
export function PageSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div aria-hidden>
        <header className="border-b border-ink/[0.06] bg-paper-bright">
          <Container className="py-14 sm:py-20">
            <div className="skeleton h-3 w-24" />
            <div className="skeleton mt-6 h-10 w-full max-w-md" />
            <div className="skeleton mt-5 h-4 w-full max-w-xl" />
            <div className="skeleton mt-2.5 h-4 w-2/3 max-w-lg" />
          </Container>
        </header>
        <Section>
          <Container className="max-w-3xl space-y-4">
            {Array.from({ length: blocks }, (_, i) => (
              <div key={i} className="surface p-6">
                <div className="skeleton h-5 w-40" />
                <div className="mt-4 flex gap-2">
                  <div className="skeleton h-12 flex-1" />
                  <div className="skeleton h-12 flex-1" />
                  <div className="skeleton h-12 flex-1" />
                </div>
              </div>
            ))}
          </Container>
        </Section>
      </div>
    </div>
  );
}
