import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Card, re-themed for CCF Centris — the primitive behind `Card`
 * and `LinkCard` in components/ui.tsx. Just the shell; add sub-parts
 * (CardHeader/Content/…) when a real consumer needs them.
 */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "surface transition-colors duration-200",
        className,
      )}
      {...props}
    />
  );
}
