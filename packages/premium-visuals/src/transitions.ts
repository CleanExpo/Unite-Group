'use client';
/**
 * Page transitions via the View Transitions API, with graceful fallback and reduced-motion respect.
 * Next.js: `import { unstable_ViewTransition } from 'react'` where available, else navigate().
 */
export function navigateWithTransition(go: () => void) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (reduce || !doc.startViewTransition) return go();
  doc.startViewTransition(go);
}

/** Add to global CSS once (crossfade + slight rise; disabled for reduced motion). */
export const viewTransitionCSS = `
@view-transition { navigation: auto; }
::view-transition-old(root) { animation: 260ms cubic-bezier(.4,0,1,1) both pv-out; }
::view-transition-new(root) { animation: 420ms cubic-bezier(.16,1,.3,1) both pv-in; }
@keyframes pv-out { to { opacity: 0; transform: translateY(-8px); } }
@keyframes pv-in { from { opacity: 0; transform: translateY(12px); } }
@media (prefers-reduced-motion: reduce) { ::view-transition-old(root), ::view-transition-new(root) { animation: none; } }
`;

/** Shared Motion presets for consistent timing across all CleanExpo sites. */
export const motionTokens = {
  ease: [0.16, 1, 0.3, 1] as const,
  durations: { fast: 0.25, base: 0.6, slow: 0.9 },
} as const;
