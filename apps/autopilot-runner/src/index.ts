// apps/autopilot-runner/src/index.ts
//
// Entrypoint — composes the full live loop for one tick:
//   clone repo → claim packet → worktree → Claude authors → publish branch →
//   open PR → (merge gate). The merge gate is intentionally NOT satisfied in v1:
//   no reviewer approval is posted, so decideMerge resolves to "pending" and the
//   PR is left for a human to merge ("autonomous up to the merge button").
//   `CC_LINEAR_LIVE != 1` drains immediately.

import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { loadHandoffConfig, makeFetchPacket } from './adapters/handoff.js'
import { runCommand, runGit } from './adapters/exec.js'
import { createWorktree, removeWorktree, worktreePathForBranch } from './worktree.js'
import { runGauntlet } from './gauntlet.js'
import { makeAuthor } from './adapters/author.js'
import { makeOpenPr, makeEvaluateMerge, makeMergePr } from './adapters/github.js'
import { octokitGithubOpsFromEnv, getRunnerInstallationToken } from './adapters/github-octokit.js'
import { ensureClone, publishBranch } from './adapters/git-repo.js'
import { runOnce, type RunOnceDeps } from './run-once.js'

function log(msg: string): void {
  console.log(`[autopilot-runner] ${msg}`)
}

const WORK = path.join(os.tmpdir(), 'autopilot')
const REPO_DIR = path.join(WORK, 'repo')
const WORKTREES = path.join(WORK, 'worktrees')

/** Stage the worker prompt to a file inside the worktree. */
async function writePromptFile(worktreePath: string, prompt: string): Promise<string> {
  const p = path.join(worktreePath, '.autopilot-prompt.md')
  await fs.writeFile(p, prompt, 'utf-8')
  return p
}

export async function main(env: NodeJS.ProcessEnv = process.env): Promise<number> {
  const live = env.CC_LINEAR_LIVE === '1'
  log(`boot — live gate ${live ? 'ON' : 'OFF'}`)
  if (!live) {
    log('CC_LINEAR_LIVE != 1 → draining; no work claimed.')
    return 0
  }

  const handoff = loadHandoffConfig(env)
  if (!handoff.ok) {
    log(`config error: ${handoff.error}`)
    return 1
  }

  const repoSlug = env.GH_REPO ?? 'CleanExpo/Unite-Group'
  let token: string
  let githubOps: Awaited<ReturnType<typeof octokitGithubOpsFromEnv>>
  try {
    token = await getRunnerInstallationToken(env)
    githubOps = await octokitGithubOpsFromEnv(env)
  } catch (err) {
    log(`GitHub App auth error: ${err instanceof Error ? err.message : String(err)}`)
    return 1
  }

  await fs.mkdir(WORK, { recursive: true })
  const cloned = await ensureClone({ git: runGit }, { repoDir: REPO_DIR, repo: repoSlug, token, parentDir: WORK })
  if (!cloned.ok) {
    log(`clone failed: ${cloned.error}`)
    return 1
  }

  const deps: RunOnceDeps = {
    fetchPacket: makeFetchPacket(handoff.config),
    prepareWorktree: (packet) =>
      createWorktree({ git: runGit }, {
        repoDir: REPO_DIR,
        worktreePath: worktreePathForBranch(WORKTREES, packet.branchName),
        branch: packet.branchName,
      }),
    cleanupWorktree: async (p) => {
      await removeWorktree({ git: runGit }, { repoDir: REPO_DIR, worktreePath: p })
    },
    author: makeAuthor({ run: runCommand, writePrompt: writePromptFile }),
    // v1 gauntlet: the PR's CI + human review are the gate (merge is human-gated).
    // A repo-wide gauntlet inside the runner is a deliberate later enhancement.
    runGauntlet: (worktreePath) => runGauntlet({ run: runCommand, cwd: worktreePath }, ['true']),
    publishBranch: (packet, worktreePath) =>
      publishBranch({ git: runGit }, {
        worktreePath,
        branch: packet.branchName,
        repo: repoSlug,
        token,
        message: `${packet.issue.identifier}: ${packet.issue.title}\n\nAuthored by the Stage-3 autopilot runner.`,
      }),
    openPr: makeOpenPr(githubOps),
    evaluateMerge: makeEvaluateMerge(githubOps, { liveGate: () => env.CC_LINEAR_LIVE === '1' }),
    mergePr: makeMergePr(githubOps),
  }

  const outcome = await runOnce(deps)
  log(`run outcome: ${JSON.stringify(outcome)}`)
  return 0
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      log(`fatal: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    })
}
