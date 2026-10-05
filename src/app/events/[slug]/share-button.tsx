"use client";

import { useState } from "react";

/** Share sheet on phones; copies the link everywhere else. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        } catch {
          // Closing the share sheet isn't an error worth showing.
        }
      }}
      className="btn-press inline-flex min-h-12 items-center gap-2 rounded-lg border border-edge bg-paper-bright px-5 text-[0.98rem] font-semibold text-ink transition-colors hover:border-clay hover:text-clay"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
      </svg>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
