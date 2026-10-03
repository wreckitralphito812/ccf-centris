"use client";

/** Prints the day sheet. The admin chrome hides itself in print. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn-press inline-flex min-h-10 items-center gap-2 rounded-lg border border-edge bg-paper-bright px-4 text-[0.92rem] font-semibold text-ink transition-colors hover:border-clay hover:text-clay print:hidden"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2" />
        <path d="M6 14h12v7H6z" />
      </svg>
      Print day sheet
    </button>
  );
}
