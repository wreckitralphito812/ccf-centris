import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class-name combiner for the vendored shadcn primitives in `components/ui/`.
 * `clsx` resolves conditionals; `twMerge` de-dupes conflicting Tailwind
 * utilities so a caller's `className` can override a variant's default.
 *
 * The rest of the codebase uses `cx` from `components/ui` (no tailwind-merge)
 * — that stays; this is additive.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
