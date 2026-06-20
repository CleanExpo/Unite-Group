// apps/autopilot-runner/src/run-once.ts
//
// The orchestrator: one autonomous tick. Composes the slices into the pipeline
//   fetch packet → isolated worktree → author → re-run gauntlet → open PR →
//   decideMerge → merge / leave-for-human / pending → cleanup
// (spec §4/§5). Every side effect is dependency-injected so the whole pipeline —
// and every fail-closed branch — is unit-tested with fakes. The worktree is
// always cleaned up (finally), and any failure short-circuits without merging.

import type { FetchPacketResult, LinearExecutionPacket } from './packet'
import type { WorktreeResult } from './worktree'
import type { GauntletResult } from './gauntlet'
import { decideMerge, type MergeContext } from './merge-policy'

export type OpenPrResult =
  | { ok: true; prNumber: number; url: string }
  | { ok: false; error: string }

export interface RunOnceDeps {
  /** Pull the next packet from the deployed handoff endpoint. */
  fetchPacket: () => Promise<FetchPacketResult>
  /** Create an isolated worktree + branch for this packet. */
  prepareWorktree: (packet: LinearExecutionPacket) => Promise<WorktreeResult>
  /** Always-run cleanup of the worktree. */
  cleanupWorktree: (path: string) => Promise<void>
  /** Run the Claude worker against the packet prompt inside the worktree. */
  author: (packet: LinearExecutionPacket, worktreePath: string) => Promise<{ ok: boolean; error?: string }>
  /** Re-run the verification gauntlet in the worktree (a worker's green is unconfirmed). */
  runGauntlet: (worktreePath: string) => Promise<GauntletResult>
  /** Open the PR (GitHub App, author identity). */
  openPr: (packet: LinearExecutionPacket) => Promise<OpenPrResult>
  /** Build the merge context (CI status, reviewer verdict, labels, …) for the PR. */
  evaluateMerge: (prNumber: number, packet: LinearExecutionPacket) => Promise<MergeContext>
  /** Squash-merge the PR (only ever called when decideMerge says merge). */
  mergePr: (prNumber: number) => Promise<{ ok: boolean; error?: string }>
}

export type RunStage = 'fetch' | 'worktree' | 'open_pr' | 'merge'

export type RunOutcome =
  | { status: 'idle' }
  | { status: 'error'; stage: RunStage; error: string }
  | { status: 'left_for_human'; reason: string; prNumber?: number }
  | { status: 'pending'; reason: string; prNumber: number }
  | { status: 'merged'; prNumber: number }

/**
 * Run one autonomous tick. Returns a typed outcome; never throws for an expected
 * failure. The worktree is always cleaned up.
 */
export async function runOnce(deps: RunOnceDeps): Promise<RunOutcome> {
  const fetched = await deps.fetchPacket()
  if (fetched.status === 'idle') return { status: 'idle' }
  if (fetched.status === 'error') return { status: 'error', stage: 'fetch', error: fetched.error }
  const packet = fetched.packet

  const wt = await deps.prepareWorktree(packet)
  if (!wt.ok) return { status: 'error', stage: 'worktree', error: wt.error }

  try {
    const authored = await deps.author(packet, wt.path)
    if (!authored.ok) {
      return { status: 'left_for_human', reason: `authoring failed: ${authored.error ?? 'unknown'}` }
    }

    // The runner re-runs the gauntlet itself — a worker's "green" is unconfirmed.
    const gauntlet = await deps.runGauntlet(wt.path)
    if (!gauntlet.passed) {
      return { status: 'left_for_human', reason: `gauntlet failed at ${gauntlet.failedAt}` }
    }

    const pr = await deps.openPr(packet)
    if (!pr.ok) return { status: 'error', stage: 'open_pr', error: pr.error }

    const decision = decideMerge(await deps.evaluateMerge(pr.prNumber, packet))
    if (decision.action === 'wait') {
      return { status: 'pending', reason: decision.reason, prNumber: pr.prNumber }
    }
    if (decision.action === 'leave_for_human') {
      return { status: 'left_for_human', reason: decision.reason, prNumber: pr.prNumber }
    }

    const merged = await deps.mergePr(pr.prNumber)
    if (!merged.ok) return { status: 'error', stage: 'merge', error: merged.error ?? 'merge failed' }
    return { status: 'merged', prNumber: pr.prNumber }
  } finally {
    await deps.cleanupWorktree(wt.path).catch(() => {})
  }
}
