"use client";

import { useEffect, useState } from "react";
import { fmtTime } from "@/lib/format";

/**
 * Live countdown to the next service. Rendered client-side because the
 * server has no business guessing the viewer's clock, and because a static
 * "in 3 hours" goes stale on a page people leave open on Sunday morning.
 */
export function Countdown({ target }: { target: string }) {
  const [left, setLeft] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (ms <= 0) {
        setLeft(null);
        return;
      }
      const total = Math.floor(ms / 1000);
      const d = Math.floor(total / 86400);
      const h = Math.floor((total % 86400) / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      setLeft(
        d > 0
          ? `${d}d ${h}h ${m}m`
          : h > 0
            ? `${h}h ${m}m ${String(s).padStart(2, "0")}s`
            : `${m}m ${String(s).padStart(2, "0")}s`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!left) return null;

  return (
    <span className="font-display tabular-nums" suppressHydrationWarning>
      {left}
    </span>
  );
}

/** "Starts at 9:00 AM" rendered on the client to avoid timezone flicker. */
export function LocalTime({ at }: { at: string }) {
  const [text, setText] = useState(() => fmtTime(at));
  useEffect(() => setText(fmtTime(at)), [at]);
  return <span suppressHydrationWarning>{text}</span>;
}
