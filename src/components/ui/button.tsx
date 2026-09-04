import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * shadcn/ui Button, re-themed for CCF Centris.
 *
 * `variant` = the site's button tones (see the comment block that used to
 * live in ui.tsx): `-on-dark` tones are for sections over --night or photos;
 * they exist as real variants, not className overrides, because an override
 * of equal specificity loses to the variant depending on stylesheet order
 * and silently produced cream-on-cream buttons.
 *
 * The global `:focus-visible` rule in globals.css supplies the focus ring —
 * no `focus-visible:ring-*` here. `.btn-press` lifts the control above the
 * fixed grain `body::before`.
 */
export const TONES = [
  "primary",
  "ink",
  "outline",
  "ghost",
  "sky",
  "on-dark",
  "outline-on-dark",
  "ghost-on-dark",
] as const;

export type ButtonTone = (typeof TONES)[number];

export const buttonVariants = cva(
  "btn-press inline-flex items-center justify-center gap-2 border font-semibold uppercase tracking-[0.1em] transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-clay text-paper-bright border-clay hover:bg-clay-deep hover:border-clay-deep",
        ink: "bg-ink text-paper-bright border-ink hover:bg-night hover:border-night",
        outline:
          "bg-transparent text-ink border-ink hover:bg-ink hover:text-paper-bright",
        ghost:
          "bg-transparent text-ink border-transparent hover:border-ink/30 hover:bg-ink/5",
        sky: "bg-sky text-paper-bright border-sky hover:brightness-110",
        "on-dark":
          "bg-paper-bright text-night border-paper-bright hover:bg-bone hover:border-bone",
        "outline-on-dark":
          "bg-transparent text-paper-bright border-paper-bright hover:bg-paper-bright hover:text-night",
        "ghost-on-dark":
          "bg-transparent text-paper-bright border-transparent hover:border-paper-bright/40 hover:bg-paper-bright/10",
      },
      size: {
        sm: "px-3.5 py-1.5 text-[0.78rem]",
        md: "px-5 py-2.5 text-[0.86rem]",
        lg: "px-5 py-3 text-[0.9rem] sm:px-7 sm:py-3.5 sm:text-[0.95rem]",
      },
      full: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      full: false,
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, full }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
