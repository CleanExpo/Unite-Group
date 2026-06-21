// apps/autopilot-runner/src/adapters/author.ts
//
// Claude authoring adapter: runs the headless Claude worker against the packet
// prompt inside the worktree. The orchestration — stage the prompt, run the
// worker, map its exit to ok/error — is unit-tested via injected deps. The exact
// `claude` CLI invocation (flags) is verified at deploy against the real binary
// + ANTHROPIC_API_KEY; it lives in defaultClaudeCommand and is overridable.

import type { LinearExecutionPacket } from '../packet'

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

/** Default headless Claude Code invocation. Exact flags verified at deploy. */
export function defaultClaudeCommand(promptFile: string): string {
  return `claude -p "$(cat ${promptFile})" --permission-mode acceptEdits`
}

/** author: implement the packet's DoD in the worktree via the Claude worker. */
export function makeAuthor(deps: AuthorDeps): (packet: LinearExecutionPacket, worktreePath: string) => Promise<{ ok: boolean; error?: string }> {
  const build = deps.buildCommand ?? defaultClaudeCommand
  return async (packet, worktreePath) => {
    let promptFile: string
    try {
      promptFile = await deps.writePrompt(worktreePath, packet.prompt)
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
