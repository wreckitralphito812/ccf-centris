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
