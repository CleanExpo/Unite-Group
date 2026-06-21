// apps/autopilot-runner/src/adapters/git-repo.ts
//
// Repo clone/sync + branch publish for the runner. The runner has no repo in its
// container, so each run it ensures a fresh clone of origin/main, then (after the
// worker authors changes in a worktree) commits and pushes the feature branch.
//
// Git auth uses a short-lived GitHub App installation token in the remote URL
// (standard CI pattern; the container is ephemeral and the token is repo-scoped).
// All git invocation is dependency-injected so this is unit-tested without a repo.

export interface GitOutcome {
  exitCode: number
  stdout: string
  stderr: string
}
export type GitRunner = (args: string[], cwd: string) => Promise<GitOutcome>
export interface GitExec {
  git: GitRunner
}

/** Token-authed HTTPS remote for a GitHub App installation. */
export function tokenRemoteUrl(repo: string, token: string): string {
  return `https://x-access-token:${token}@github.com/${repo}.git`
}

function ok(o: GitOutcome): boolean {
  return o.exitCode === 0
}
function err(o: GitOutcome, label: string): string {
  return o.stderr.trim() || `${label} exited ${o.exitCode}`
}

export interface EnsureCloneOptions {
  /** Directory the clone lives in. */
  repoDir: string
  /** "owner/name". */
  repo: string
  /** Installation token for HTTPS auth. */
  token: string
  /** Base branch to sync to. Defaults to main. */
  baseBranch?: string
  /** Parent directory of repoDir (so we can clone into it). */
  parentDir: string
}

export type CloneResult = { ok: true } | { ok: false; error: string }

/**
 * Ensure repoDir is a clean clone synced to origin/<baseBranch>.
 * If it isn't a git repo yet, clone; otherwise fetch + hard-reset to origin.
 */
export async function ensureClone(deps: GitExec, opts: EnsureCloneOptions): Promise<CloneResult> {
  const base = opts.baseBranch ?? 'main'
  const url = tokenRemoteUrl(opts.repo, opts.token)

  const isRepo = await deps.git(['rev-parse', '--git-dir'], opts.repoDir).catch(() => ({ exitCode: 1, stdout: '', stderr: 'not a repo' }))
  if (ok(isRepo)) {
    // Existing clone — refresh credentials, fetch, hard reset.
    const steps: Array<[string[], string]> = [
      [['remote', 'set-url', 'origin', url], 'set-url'],
      [['fetch', '--depth', '1', 'origin', base], 'fetch'],
      [['checkout', '-B', base, `origin/${base}`], 'checkout'],
      [['reset', '--hard', `origin/${base}`], 'reset'],
      [['worktree', 'prune'], 'worktree-prune'],
    ]
    for (const [args, label] of steps) {
      const o = await deps.git(args, opts.repoDir)
      if (!ok(o)) return { ok: false, error: err(o, label) }
    }
    return { ok: true }
  }

  // Fresh clone.
  const clone = await deps.git(['clone', '--depth', '1', '--branch', base, url, opts.repoDir], opts.parentDir)
  if (!ok(clone)) return { ok: false, error: err(clone, 'clone') }
  return { ok: true }
}

export interface PublishBranchOptions {
  /** The worktree path with the authored changes. */
  worktreePath: string
  /** Feature branch name (already checked out in the worktree). */
  branch: string
  /** "owner/name". */
  repo: string
  /** Installation token for the push. */
  token: string
  /** Commit message. */
  message: string
  /** Commit author identity. */
  authorName?: string
  authorEmail?: string
}

export type PublishResult =
  | { ok: true; hasChanges: true }
  | { ok: true; hasChanges: false }
  | { ok: false; error: string }

/**
 * Stage everything, and if there are changes, commit and push the branch.
 * Returns hasChanges:false (without committing/pushing) when the worker made no
 * edits — the orchestrator treats that as "nothing to PR".
 */
export async function publishBranch(deps: GitExec, opts: PublishBranchOptions): Promise<PublishResult> {
  const name = opts.authorName ?? 'unite-autopilot[bot]'
  const email = opts.authorEmail ?? 'autopilot@unite-group.in'

  const add = await deps.git(['add', '-A'], opts.worktreePath)
  if (!ok(add)) return { ok: false, error: err(add, 'add') }

  const status = await deps.git(['status', '--porcelain'], opts.worktreePath)
  if (!ok(status)) return { ok: false, error: err(status, 'status') }
  if (status.stdout.trim() === '') return { ok: true, hasChanges: false }

  const commitSteps: Array<[string[], string]> = [
    [['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-m', opts.message], 'commit'],
    [['push', '--set-upstream', tokenRemoteUrl(opts.repo, opts.token), opts.branch], 'push'],
  ]
  for (const [args, label] of commitSteps) {
    const o = await deps.git(args, opts.worktreePath)
    if (!ok(o)) return { ok: false, error: err(o, label) }
  }
  return { ok: true, hasChanges: true }
}
