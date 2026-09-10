"use client";

import { useState } from "react";

/** The CCF Net invite link, with a button that copies it for sharing. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const display = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the link stays visible to copy by hand.
    }
  }

  return (
    <div className="mt-5 flex flex-wrap items-stretch gap-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="font-display border border-hairline bg-paper-bright px-4 py-2.5 text-lg text-clay underline-offset-4 hover:underline"
      >
        {display}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className="btn-press label border border-ink px-4 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
