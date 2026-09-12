import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Badge, re-themed for CCF Centris. This is the primitive behind
 * `Pill` in components/ui.tsx. `.label` is the site's uppercase tracked
 * micro-type utility from globals.css.
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
  "label inline-flex items-center gap-1.5 border px-2.5 py-1",
  {
    variants: {
      variant: {
        default: "border-ink/25 text-ink",
        clay: "border-clay/40 bg-clay/10 text-clay-deep",
        sky: "border-sky/40 bg-sky/10 text-sky",
        moss: "border-moss/40 bg-moss/10 text-moss",
        live: "border-transparent bg-clay text-paper-bright",
        muted: "border-transparent bg-ink/8 text-ink-mute",
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
