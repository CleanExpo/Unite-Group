// Arming gate for the design-lessons loop (UNI-3017). DORMANT by default.
// Unarmed: the weekly refresh reads and writes nothing, and /cards/order keeps its
// current default (no film pre-selected). Flip DESIGN_LESSONS_LIVE=1 only at founder
// go-live, after the design_events / design_lessons migration is applied.

export function isDesignLessonsArmed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DESIGN_LESSONS_LIVE === '1'
}
