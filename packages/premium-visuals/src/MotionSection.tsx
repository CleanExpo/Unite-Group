'use client';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

const variants: Record<'rise' | 'fade' | 'stagger', Variants> = {
  rise: { hidden: { opacity: 0, y: 32 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } } },
  fade: { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.9 } } },
  stagger: { hidden: {}, show: { transition: { staggerChildren: 0.09 } } },
};

/** Scroll-revealed section. Every marketing page needs at least one (check-visuals enforces). */
export function MotionSection({ children, effect = 'rise', className, as = 'section' }:
  { children: ReactNode; effect?: keyof typeof variants; className?: string; as?: 'section' | 'div' }) {
  const reduce = useReducedMotion();
  const Tag = as === 'div' ? motion.div : motion.section;
  return (
    <Tag data-pv-motion className={className} initial={reduce ? false : 'hidden'} whileInView="show"
      viewport={{ once: true, margin: '-12% 0px' }} variants={variants[effect]}>
      {children}
    </Tag>
  );
}

export function MotionItem({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={variants.rise}>{children}</motion.div>;
}
