// apps/autopilot-runner/src/shadow.ts
//
// Shadow mode: run the full autonomous pipeline (runOnce) end-to-end but perform
// ZERO live writes. The three write-effect deps — publishBranch, openPr, mergePr —
// are replaced with recorders that capture what WOULD have happened. Every read /
// ephemeral dep (fetchPacket, prepareWorktree, author, runGauntlet, evaluateMerge,
// cleanupWorktree) passes through unchanged, so a shadow run exercises the real
// decision path while being physically incapable of pushing, PR-ing, or merging.
//
// This is the "prove it before it goes live" harness: wrap live deps in withShadow
// and the pipeline cannot touch GitHub or Linear, no matter what the merge decision is.

import type { RunOnceDeps } from './run-once.js'

export type ShadowWrite =
  | { type: 'publish'; branch: string }
  | { type: 'open_pr'; issue: string }
  | { type: 'merge'; prNumber: number }

export interface ShadowHandle {
  deps: RunOnceDeps
  /** The writes the pipeline attempted — recorded, never performed. */
  writes: ShadowWrite[]
}

export function withShadow(deps: RunOnceDeps): ShadowHandle {
  const writes: ShadowWrite[] = []

  const shadowed: RunOnceDeps = {
    ...deps,
    publishBranch: async (packet) => {
      writes.push({ type: 'publish', branch: packet.branchName })
      return { ok: true, hasChanges: true }
    },
    openPr: async (packet) => {
      writes.push({ type: 'open_pr', issue: packet.issue.identifier })
      return { ok: true, prNumber: -1, url: `shadow://pr/${packet.issue.identifier}` }
    },
    mergePr: async (prNumber) => {
      writes.push({ type: 'merge', prNumber })
      return { ok: true }
    },
  }

  return { deps: shadowed, writes }
}
