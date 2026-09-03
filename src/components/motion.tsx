"use client";

/* ---------------------------------------------------------------------------
   Motion primitives for the homepage.

   Server components stay server components: each of these takes `children`
   (already-rendered server output) and only adds the animation shell around
   it, so page.tsx keeps all its data fetching and ships almost no extra JS
   for the content itself.

   Every primitive honours `prefers-reduced-motion` — when the visitor has
   asked for less motion, children render in their final state with no
   transform, no scroll listener, no count-up.
--------------------------------------------------------------------------- */

import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import { cx } from "./ui";
import { SectionIcon, type IconName } from "./icons";

/* Shared easing — matches --ease in globals.css. */
const EASE = [0.2, 0.7, 0.2, 1] as const;

/* --- Reveal --------------------------------------------------------------- */

/**
 * Fade + rise a block into view the first time it crosses into the viewport.
 * Used to bring each section up as the visitor scrolls.
 */
export function Reveal({
  children,
  className,
  y = 24,
  delay = 0,
  once = true,
  amount = 0.25,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  once?: boolean;
  amount?: number;
  as?: "div" | "section" | "article" | "ul" | "li";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once, amount });

  const Tag = motion[as] as typeof motion.div;

  if (reduce) {
    const Plain = as as "div";
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      ref={ref as RefObject<HTMLDivElement>}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/* --- Stagger ------------------------------------------------------------- */

const staggerParent: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const staggerChild: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/**
 * Reveal a list/grid so its items arrive one after another. Each direct child
 * is wrapped in a motion item; pass plain elements (cards, list items).
 */
export function Stagger({
  children,
  className,
  amount = 0.2,
  itemClassName,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
  itemClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount });

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={staggerParent}
      initial="hidden"
      animate={inView ? "shown" : "hidden"}
    >
      {Children.map(children, (child) =>
        isValidElement(child) ? (
          <motion.div variants={staggerChild} className={itemClassName}>
            {child}
          </motion.div>
        ) : (
          child
        ),
      )}
    </motion.div>
  );
}

/* --- RevealItems / RevealItem --------------------------------------------

   Stagger the direct children of a prose block — an eyebrow, a heading, a
   paragraph, a button row — so each line rises in a beat after the one
   above as the block scrolls into view. Lighter travel and a quicker cadence
   than Stagger, which is tuned for cards.

   Use RevealItems around a group; drop RevealItem inside it for one child, or
   use RevealItem on its own for a single element that should reveal on scroll.
--------------------------------------------------------------------------- */

const textParent: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};

const textChild: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export function RevealItems({
  children,
  className,
  amount = 0.3,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
  as?: "div" | "section" | "header" | "ul";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount });

  if (reduce) {
    const Plain = as as "div";
    return <Plain className={className}>{children}</Plain>;
  }

  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      ref={ref as RefObject<HTMLDivElement>}
      className={className}
      variants={textParent}
      initial="hidden"
      animate={inView ? "shown" : "hidden"}
    >
      {Children.map(children, (child) =>
        isValidElement(child) ? (
          <motion.div variants={textChild}>{child}</motion.div>
        ) : (
          child
        ),
      )}
    </Tag>
  );
}

/**
 * One element that fades and rises the first time it scrolls into view.
 * Standalone (its own IntersectionObserver) unless it sits inside a
 * RevealItems, where it just inherits the parent's stagger via `variants`.
 */
export function RevealItem({
  children,
  className,
  y = 14,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  as?: "div" | "p" | "span" | "li" | "h2" | "h3";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.5 });

  if (reduce) {
    const Plain = as as "div";
    return <Plain className={className}>{children}</Plain>;
  }

  const Tag = motion[as] as typeof motion.div;

  return (
    <Tag
      ref={ref as RefObject<HTMLDivElement>}
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

/* --- RevealHead ----------------------------------------------------------

   A section header — eyebrow, title, lead, optional action — whose lines
   cascade in as it scrolls into view. Same DOM as ui's SectionHead (so the
   flex layout is unchanged), just each line wrapped to fade + rise a beat
   after the one above. Kept here (a client module) so ui.tsx stays
   server-only. Honours reduced motion via RevealItem.
--------------------------------------------------------------------------- */

export function RevealHead({
  eyebrow,
  icon,
  title,
  lead,
  action,
  tone = "clay",
  align = "start",
  className,
}: {
  eyebrow?: string;
  icon?: IconName;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  tone?: "clay" | "ink" | "paper";
  align?: "start" | "center";
  className?: string;
}) {
  const centered = align === "center";
  const eyebrowColor =
    tone === "clay"
      ? "text-clay"
      : tone === "paper"
        ? "text-paper-bright/60"
        : "text-ink-mute";
  const leadColor = tone === "paper" ? "text-paper-bright/70" : "text-ink-soft";
  const chipRing = tone === "paper" ? "border-paper-bright/25" : "border-current/25";

  return (
    <div
      className={cx(
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6",
        centered && "md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cx("max-w-2xl", centered && "mx-auto text-center")}>
        {eyebrow ? (
          <RevealItem
            as="p"
            className={cx(
              "label flex items-center gap-2.5",
              centered && "justify-center",
              eyebrowColor,
            )}
          >
            {icon ? (
              <span
                className={cx(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                  chipRing,
                )}
              >
                <SectionIcon name={icon} className="h-3.5 w-3.5" />
              </span>
            ) : !centered ? (
              <span aria-hidden className="h-px w-8 bg-current opacity-50" />
            ) : null}
            {eyebrow}
          </RevealItem>
        ) : null}
        <RevealItem as="h2" className="display-md mt-4 text-balance">
          {title}
        </RevealItem>
        {lead ? (
          <RevealItem
            as="p"
            className={cx(
              "mt-3 text-[0.98rem] leading-relaxed sm:mt-4 sm:text-[1.02rem]",
              leadColor,
            )}
          >
            {lead}
          </RevealItem>
        ) : null}
      </div>
      {action ? (
        <RevealItem className="shrink-0">{action}</RevealItem>
      ) : null}
    </div>
  );
}

/* --- Hero entrance ----------------------------------------------------------

   A single staged reveal for the hero copy: the children arrive top to
   bottom (eyebrow → headline → script → paragraph → buttons → service line)
   a beat apart. Runs once on mount — the hero is above the fold.
--------------------------------------------------------------------------- */

const heroParent: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};

const heroChild: Variants = {
  hidden: { opacity: 0, y: 22 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

export function HeroStage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={heroParent}
      initial="hidden"
      animate="shown"
    >
      {Children.map(children, (child) =>
        isValidElement(child) ? (
          <motion.div variants={heroChild}>{child}</motion.div>
        ) : (
          child
        ),
      )}
    </motion.div>
  );
}

/* --- Parallax ------------------------------------------------------------- */

/**
 * Shift a decorative element on scroll. `distance` is the total travel in px
 * across the element's pass through the viewport; positive moves it up.
 */
export function Parallax({
  children,
  className,
  distance = 60,
}: {
  children: ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const raw = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const y = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}

/* --- Count up ----------------------------------------------------------------

   Ticks a number from 0 to its value once it scrolls into view. For the
   Dgroup count and facility capacities — figures that reward a beat of
   attention. Renders the final value immediately under reduced motion or
   before it enters view (so it is correct for crawlers and no-JS).
--------------------------------------------------------------------------- */

export function CountUp({
  value,
  className,
  duration = 1.1,
  format = (n: number) => n.toLocaleString(),
  suffix = "",
  prefix = "",
}: {
  value: number;
  className?: string;
  duration?: number;
  format?: (n: number) => string;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce || !inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {format(reduce ? value : inView ? display : 0)}
      {suffix}
    </span>
  );
}

/* --- Card entrance ---------------------------------------------------------

   A single card that rises and fades in on mount, then settles. Used for the
   "next service" card in the Watch section — it draws a beat of attention as
   the page loads without waiting for a scroll. Honours reduced motion.
--------------------------------------------------------------------------- */

export function CardEntrance({
  children,
  className,
  delay = 0.2,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* --- Pulse dot -------------------------------------------------------------

   A small teal dot with a slow expanding ring. Marks "next service" as a
   live, forward-looking thing. Static under reduced motion.
--------------------------------------------------------------------------- */

export function PulseDot({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <span
      className={className}
      style={{ position: "relative", display: "inline-flex", width: 8, height: 8 }}
    >
      {!reduce ? (
        <motion.span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            background: "currentColor",
          }}
          initial={{ opacity: 0.5, scale: 1 }}
          animate={{ opacity: 0, scale: 2.6 }}
          transition={{ duration: 1.8, ease: "easeOut", repeat: Infinity }}
        />
      ) : null}
      <span
        style={{
          position: "relative",
          width: 8,
          height: 8,
          borderRadius: "9999px",
          background: "currentColor",
        }}
      />
    </span>
  );
}

/* --- Hover lift --------------------------------------------------------------

   A card that lifts and lightly shadows on hover — the interactive
   counterpart to the scroll reveals. Wraps a single child.
--------------------------------------------------------------------------- */

export function HoverLift({
  children,
  className,
  lift = -6,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  lift?: number;
} & ComponentProps<typeof motion.div>) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={className} {...(rest as ComponentProps<"div">)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      whileHover={{ y: lift }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
