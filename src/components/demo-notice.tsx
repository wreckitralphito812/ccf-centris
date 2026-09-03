"use client";

import { useEffect, useState } from "react";

const KEY = "ccf-demo-notice-dismissed";

/**
 * CCF Centris is a real center, but the schedules, speakers, prices and
 * availability in this build are representative placeholders for the admin
 * to replace. Saying so plainly is the honest thing, and in a pitch it makes
 * the CMS argument for us.
 */
export function DemoNotice() {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  return (
    <div className="bg-ink text-paper-bright">
      <div className="mx-auto flex max-w-[110rem] items-center gap-4 px-5 py-2 sm:px-8">
        <p className="text-[0.78rem] leading-snug text-paper-bright/80">
          <span className="label mr-2 text-clay">Preview</span>
          Service times, speakers, pricing and availability shown here are
          sample content for demonstration. Confirmed details will be published
          by the CCF Centris team.
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem(KEY, "1");
            } catch {
              /* private mode; dismiss for this page view only */
            }
            setHidden(true);
          }}
          className="label ml-auto shrink-0 px-2 py-1 text-paper-bright/60 transition-colors hover:text-paper-bright"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
