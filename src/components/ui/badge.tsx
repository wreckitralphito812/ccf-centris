import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Badge, re-themed for CCF Centris. This is the primitive behind
 * `Pill` in components/ui.tsx. Since the calm redesign (2026-09-30) badges are
 * soft sentence-case tags on pale washes, with no border.
 */
export const PILL_TONES = [
  "default",
  "clay",
  "sky",
  "moss",
  "live",
  "muted",
] as const;

export type PillTone = (typeof PILL_TONES)[number];

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.8rem] font-medium",
  {
    variants: {
      variant: {
        default: "bg-rule text-ink",
        clay: "bg-clay-wash text-clay-deep",
        sky: "bg-sky-wash text-sky",
        moss: "bg-moss/10 text-moss",
        live: "bg-clay text-paper-bright",
        muted: "bg-rule text-ink-mute",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
