'use client';

// AnimatedCounter — rolls numeric values smoothly when they change.
//
// Used in Zone 2 KPI tiles so values like ARR or pipeline$ don't snap
// abruptly — agentic systems should look like data is moving, not
// jumping. Framer Motion's useSpring keeps the motion native; we render
// the integer projection so the digits don't blur.

import { useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export interface AnimatedCounterProps {
  value: number;
  format?: (n: number) => string;
  /** Duration heuristic — higher stiffness = snappier. */
  stiffness?: number;
  damping?: number;
}

export function AnimatedCounter({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  stiffness = 120,
  damping = 24,
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness, damping });
  const projected = useTransform(spring, (n) => format(n));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  // Render as a span so it composes inside any line of text.
  return (
    <motion.span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {projected}
    </motion.span>
  );
}
