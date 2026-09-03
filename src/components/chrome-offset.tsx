"use client";

import { useEffect } from "react";

/**
 * Publishes the height of the chrome above <main> as `--chrome`.
 *
 * The demo notice may or may not be present and the header reflows at small
 * widths, so the offset a full-height hero subtracts is not a constant.
 * Measuring it keeps `min-h-[calc(100svh-var(--chrome))]` honest as that
 * chrome appears, disappears, or reflows.
 */
export function ChromeOffset() {
  useEffect(() => {
    const main = document.getElementById("main");
    if (!main) return;

    // Sum the heights of main's preceding siblings rather than reading main's
    // document offset: the header is sticky, so once the page is scrolled its
    // box no longer sits above main and an offset read would grow with scroll.
    const set = () => {
      let top = 0;
      for (const el of Array.from(main.parentElement?.children ?? [])) {
        if (el === main) break;
        top += (el as HTMLElement).offsetHeight;
      }
      document.documentElement.style.setProperty("--chrome", `${top}px`);
    };

    set();

    // Re-measure when the chrome resizes...
    const ro = new ResizeObserver(set);
    const observeSiblings = () => {
      ro.disconnect();
      for (const el of Array.from(main.parentElement?.children ?? [])) {
        if (el !== main) ro.observe(el);
      }
      set();
    };
    observeSiblings();

    // ...and when a bar or notice is added or removed outright, which changes
    // the offset without resizing anything already being watched.
    const mo = new MutationObserver(observeSiblings);
    if (main.parentElement) mo.observe(main.parentElement, { childList: true });

    window.addEventListener("resize", set);

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", set);
    };
  }, []);

  return null;
}
