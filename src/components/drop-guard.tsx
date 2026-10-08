"use client";

import { useEffect } from "react";

/**
 * Stops a file dropped outside a drop target from making the browser open
 * the picture and leave the page (2026-10-08).
 */
export function DropGuard() {
  useEffect(() => {
    const stop = (ev: DragEvent) => {
      if (ev.dataTransfer?.types.includes("Files")) ev.preventDefault();
    };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);
  return null;
}
