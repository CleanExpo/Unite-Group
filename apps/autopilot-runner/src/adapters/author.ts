// apps/autopilot-runner/src/adapters/author.ts
//
// Claude authoring adapter: runs the headless Claude worker against the packet
// prompt inside the worktree. The orchestration — stage the prompt, run the
// worker, map its exit to ok/error — is unit-tested via injected deps. The exact
// `claude` CLI invocation (flags) is verified at deploy against the real binary
// + ANTHROPIC_API_KEY; it lives in defaultClaudeCommand and is overridable.

import type { LinearExecutionPacket } from '../packet.js'

export interface AuthorDeps {
  /** Run a shell command in cwd. (adapters/exec runCommand in prod.) */
  run: (command: string, cwd: string) => Promise<{ exitCode: number; stdout: string; stderr: string }>
  /** Stage the prompt to a file inside the worktree; returns the file path. */
  writePrompt: (worktreePath: string, prompt: string) => Promise<string>
  /** Build the worker command from the staged prompt path. Verified at deploy. */
  buildCommand?: (promptFile: string) => string
}

function msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Default headless Claude Code invocation. Exact flags verified at deploy.
 * `< /dev/null` closes stdin so the CLI doesn't stall waiting on a pipe (the
 * prompt is passed via -p). `--dangerously-skip-permissions` requires a
 * non-root user (the container runs as `node`, not root — see Dockerfile).
 */
export function defaultClaudeCommand(promptFile: string): string {
  return `claude -p "$(cat ${promptFile})" --dangerously-skip-permissions < /dev/null`
}

/**
 * The authoring prompt: implement-only. The runner does the commit/push/PR, so
 * the worker must NOT touch git — it just makes the code changes.
 */
export function buildAuthoringPrompt(packet: LinearExecutionPacket): string {
  const link = packet.issue.url ? `\nLink: ${packet.issue.url}` : ''
  return [
    'You are an autonomous coding worker inside an isolated checkout of this repository.',
    'Implement the task below. Make CODE CHANGES ONLY — do NOT commit, push, create branches, or open a PR (that is handled for you). Do not touch secrets or destructive production paths.',
    '',
    `Task: ${packet.issue.identifier} — ${packet.issue.title}${link}`,
    '',
    'Read the issue\'s Acceptance Criteria and implement the smallest change that satisfies them. Keep changes scoped to the task.',
  ].join('\n')
}

/** author: implement the packet's DoD in the worktree via the Claude worker. */
export function makeAuthor(deps: AuthorDeps): (packet: LinearExecutionPacket, worktreePath: string) => Promise<{ ok: boolean; error?: string }> {
  const build = deps.buildCommand ?? defaultClaudeCommand
  return async (packet, worktreePath) => {
    let promptFile: string
    try {
      promptFile = await deps.writePrompt(worktreePath, buildAuthoringPrompt(packet))
    } catch (err) {
      return { ok: false, error: `failed to stage prompt: ${msg(err)}` }
    }

    let outcome: { exitCode: number; stdout: string; stderr: string }
    try {
      outcome = await deps.run(build(promptFile), worktreePath)
    } catch (err) {
      return { ok: false, error: `worker spawn failed: ${msg(err)}` }
    }

    if (outcome.exitCode !== 0) {
      return { ok: false, error: `claude exited ${outcome.exitCode}: ${outcome.stderr.slice(0, 500)}` }
    }
    return { ok: true }
  }
}
