// apps/autopilot-runner/src/loop.ts
//
// Continuous loop: pull-and-run the next task until the queue drains (idle), the
// iteration cap is hit, or the universal stop signal fires. Composes the existing
// runOnce and adds NO side effects of its own — it is pure control flow. Pair it
// with withShadow for a no-live-writes continuous run.
//
// Fail-closed: maxIters is a hard ceiling (the loop can never run unbounded), and a
// HARD_STOP file drains it before the next tick.

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { runOnce, type RunOnceDeps, type RunOutcome } from './run-once.js'

export type LoopStopReason = 'idle' | 'max_iters' | 'stopped'

export interface LoopResult {
  iterations: number
  outcomes: RunOutcome[]
  stoppedReason: LoopStopReason
}

export interface LoopOptions {
  /** Hard cap on ticks. Required — the loop can never run unbounded. */
  maxIters: number
  /** Universal halt check, evaluated before every tick. Default: HARD_STOP file. */
  shouldStop?: () => boolean | Promise<boolean>
}

/** True when the universal drain file exists (~/.claude/HARD_STOP or $CLAUDE_HARD_STOP_FILE). */
export function hardStopEngaged(
  hardStopPath: string = process.env.CLAUDE_HARD_STOP_FILE ?? join(homedir(), '.claude', 'HARD_STOP'),
): boolean {
  return existsSync(hardStopPath)
}

export async function runLoop(deps: RunOnceDeps, opts: LoopOptions): Promise<LoopResult> {
  const outcomes: RunOutcome[] = []
  const shouldStop = opts.shouldStop ?? (() => hardStopEngaged())
  const cap = Math.max(0, Math.floor(opts.maxIters))

  for (let i = 0; i < cap; i++) {
    if (await shouldStop()) return { iterations: i, outcomes, stoppedReason: 'stopped' }

    const outcome = await runOnce(deps)
    outcomes.push(outcome)

    if (outcome.status === 'idle') return { iterations: i + 1, outcomes, stoppedReason: 'idle' }
  }

  return { iterations: cap, outcomes, stoppedReason: 'max_iters' }
}
