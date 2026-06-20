// apps/autopilot-runner/src/worktree.ts
//
// Ephemeral git worktree management for the Stage-3 runner. Each run gets an
// isolated worktree of the repo (a fresh feature branch off origin/main) so
// parallel runs never collide and the runner never mutates the shared checkout.
//
// All git invocation is dependency-injected (GitRunner) so this is unit-tested
// without a real repo. Fail-closed: missing inputs, a non-zero git exit, or a
// thrown runner all resolve to `{ ok: false }`, never a half-created worktree.

export interface GitOutcome {
  exitCode: number
  stdout: string
  stderr: string
}

/** Runs `git <args>` in `cwd`. Injected (real spawn in prod, fake in tests). */
export type GitRunner = (args: string[], cwd: string) => Promise<GitOutcome>

export const DEFAULT_BASE_REF = 'origin/main'

export interface CreateWorktreeOptions {
  /** Repo root the worktree is created from. */
  repoDir: string
  /** Absolute path for the new worktree. */
  worktreePath: string
  /** Feature branch to create (e.g. packet.branchName). */
  branch: string
  /** Base ref the branch starts from. Defaults to origin/main. */
  baseRef?: string
}

export type WorktreeResult =
  | { ok: true; path: string; branch: string }
  | { ok: false; error: string }

export interface RemoveWorktreeOptions {
  repoDir: string
  worktreePath: string
}

export type RemoveResult = { ok: true } | { ok: false; error: string }

/** Derive a flat, filesystem-safe worktree path from a branch name. */
export function worktreePathForBranch(baseDir: string, branch: string): string {
  const safe = branch.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'wt'
  return `${baseDir.replace(/\/+$/, '')}/${safe}`
}

/** Create an isolated worktree with a fresh branch off `baseRef`. */
export async function createWorktree(
  deps: { git: GitRunner },
  opts: CreateWorktreeOptions,
): Promise<WorktreeResult> {
  if (!opts.repoDir || !opts.worktreePath || !opts.branch) {
    return { ok: false, error: 'createWorktree: repoDir, worktreePath and branch are required' }
  }
  const baseRef = opts.baseRef ?? DEFAULT_BASE_REF

  let outcome: GitOutcome
  try {
    outcome = await deps.git(['worktree', 'add', '-b', opts.branch, opts.worktreePath, baseRef], opts.repoDir)
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
  if (outcome.exitCode !== 0) {
    return { ok: false, error: outcome.stderr.trim() || `git worktree add exited ${outcome.exitCode}` }
  }
  return { ok: true, path: opts.worktreePath, branch: opts.branch }
}

/** Remove a worktree (force — it is ephemeral and may hold uncommitted work). */
export async function removeWorktree(
  deps: { git: GitRunner },
  opts: RemoveWorktreeOptions,
): Promise<RemoveResult> {
  if (!opts.repoDir || !opts.worktreePath) {
    return { ok: false, error: 'removeWorktree: repoDir and worktreePath are required' }
  }
  try {
    const outcome = await deps.git(['worktree', 'remove', opts.worktreePath, '--force'], opts.repoDir)
    if (outcome.exitCode !== 0) {
      return { ok: false, error: outcome.stderr.trim() || `git worktree remove exited ${outcome.exitCode}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
