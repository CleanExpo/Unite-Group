// apps/autopilot-runner/src/adapters/github.ts
//
// GitHub App client mapping logic. The runner App (author) opens + squash-merges
// PRs; the reviewer App (approver) posts the approving review elsewhere. The
// GitHub I/O is abstracted behind `GithubOps` so the mapping below — open PR +
// label, build the MergeContext, merge — is fully unit-tested. The concrete
// octokit-backed `GithubOps` is wired + verified against the live API at deploy
// (it needs the real GitHub Apps; see SETUP.md), so it is intentionally not
// implemented here yet.

import type { LinearExecutionPacket } from '../packet'
import type { OpenPrResult } from '../run-once'
import type { MergeContext } from '../merge-policy'
import { AUTONOMOUS_LABELS, DEFAULT_BASE_BRANCH } from '../merge-policy'

/** The PR label the runner stamps so the merge gate can verify it at the PR layer. */
export const RUNNER_PR_LABEL = AUTONOMOUS_LABELS[1] // 'pi-dev:autonomous'

/** The abstract GitHub operations the runner needs. Concrete impl = octokit (deploy). */
export interface GithubOps {
  createPullRequest(input: { title: string; head: string; base: string; body: string }): Promise<{ number: number; url: string }>
  addLabels(prNumber: number, labels: string[]): Promise<void>
  getCiState(prNumber: number): Promise<MergeContext['ci']>
  getReviewVerdict(prNumber: number): Promise<MergeContext['review']>
  getPrLabels(prNumber: number): Promise<string[]>
  /** True when the PR branch is up to date with base (not behind). */
  isUpToDateWithBase(prNumber: number): Promise<boolean>
  squashMerge(prNumber: number): Promise<{ merged: boolean; message?: string }>
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function prBody(packet: LinearExecutionPacket): string {
  const ref = packet.issue.url ? `\n\n${packet.issue.url}` : ''
  return (
    `Autonomous PR for **${packet.issue.identifier}** — ${packet.issue.title}.${ref}` +
    '\n\n🤖 Opened by the Stage-3 autopilot runner. Merges only after green CI + an ' +
    'independent adversarial-evaluator approval.'
  )
}

/** openPr: create the PR off the packet branch and stamp the autonomous label. */
export function makeOpenPr(ops: GithubOps): (packet: LinearExecutionPacket) => Promise<OpenPrResult> {
  return async (packet) => {
    try {
      const pr = await ops.createPullRequest({
        title: `${packet.issue.identifier}: ${packet.issue.title}`,
        head: packet.branchName,
        base: DEFAULT_BASE_BRANCH,
        body: prBody(packet),
      })
      await ops.addLabels(pr.number, [RUNNER_PR_LABEL])
      return { ok: true, prNumber: pr.number, url: pr.url }
    } catch (err) {
      return { ok: false, error: msg(err) }
    }
  }
}

/** evaluateMerge: gather CI + review + labels + freshness into a MergeContext. */
export function makeEvaluateMerge(
  ops: GithubOps,
  opts: { liveGate: () => boolean },
): (prNumber: number, packet: LinearExecutionPacket) => Promise<MergeContext> {
  return async (prNumber) => {
    const [ci, review, labels, upToDate] = await Promise.all([
      ops.getCiState(prNumber),
      ops.getReviewVerdict(prNumber),
      ops.getPrLabels(prNumber),
      ops.isUpToDateWithBase(prNumber),
    ])
    return {
      ci,
      review,
      labels,
      baseBranch: DEFAULT_BASE_BRANCH,
      linearHistory: upToDate,
      liveGate: opts.liveGate(),
      authoredByRunner: true, // by construction — the runner App opened this PR
    }
  }
}

/** mergePr: squash-merge (only ever called once decideMerge has cleared). */
export function makeMergePr(ops: GithubOps): (prNumber: number) => Promise<{ ok: boolean; error?: string }> {
  return async (prNumber) => {
    try {
      const result = await ops.squashMerge(prNumber)
      return result.merged ? { ok: true } : { ok: false, error: result.message ?? 'merge rejected' }
    } catch (err) {
      return { ok: false, error: msg(err) }
    }
  }
}
