"use client";

import { useEffect, useState } from "react";

const KEY = "ccf-saved-messages";

function readSaved(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

/**
 * Saved messages live in the member's profile once they sign in. Until then
 * this keeps the interaction real per browser rather than showing a button
 * that does nothing.
 */
export function SaveButton({ slug }: { slug: string }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(readSaved().includes(slug));
  }, [slug]);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => {
        const next = saved
          ? readSaved().filter((s) => s !== slug)
          : [...readSaved(), slug];
        try {
          window.localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* private mode */
        }
        setSaved(!saved);
      }}
      className={
        saved
          ? "label inline-flex items-center gap-2 border border-paper-bright bg-paper-bright px-4 py-2.5 text-night"
          : "label inline-flex items-center gap-2 border border-white/25 px-4 py-2.5 text-paper-bright transition-colors hover:bg-white/10"
      }
    >
      {saved ? "★ Saved" : "☆ Save"}
    </button>
  );
}

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        const url = window.location.href;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            return;
          } catch {
            /* user dismissed; fall through to copy */
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked */
        }
      }}
      className="label inline-flex items-center border border-white/25 px-4 py-2.5 text-paper-bright transition-colors hover:bg-white/10"
    >
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
