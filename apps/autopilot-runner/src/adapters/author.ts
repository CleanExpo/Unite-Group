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
 * - `--safe-mode`: disables the worktree repo's settings files (CLAUDE.md, hooks,
 *   MCP servers, plugins, skills, custom agents) — essential because the worker
 *   runs inside a checkout of THIS repo, whose `.claude/` config (PowerShell
 *   hooks, MCP servers) would otherwise hang/fail in the Linux container. Unlike
 *   `--bare`, safe-mode leaves auth working normally, so the runner can
 *   authenticate via the Max-plan token (CLAUDE_CODE_OAUTH_TOKEN). Verified
 *   end-to-end locally (exit 0, model responded).
 * - `--dangerously-skip-permissions`: no permission prompts (needs non-root user).
 * - `< /dev/null`: close stdin so the CLI doesn't stall (prompt is passed via -p).
 */
export function defaultClaudeCommand(promptFile: string): string {
  return `claude --safe-mode -p "$(cat ${promptFile})" --dangerously-skip-permissions < /dev/null`
}

/**
 * The authoring prompt: implement-only. The runner does the commit/push/PR, so
 * the worker must NOT touch git — it just makes the code changes. The worker is
 * offline (no Linear/network), so the full task — including the Acceptance
 * Criteria — must come from packet.prompt, which the handoff builds with the
 * issue body embedded. (Previously this used only the title, so the worker had
 * to guess the task; see the UNI-2176 smoke-test PR #378.)
 */
export function buildAuthoringPrompt(packet: LinearExecutionPacket): string {
  const link = packet.issue.url ? `\nLink: ${packet.issue.url}` : ''
  return [
    'You are an autonomous coding worker inside an isolated checkout of this repository.',
    'Make CODE CHANGES ONLY — do NOT commit, push, create branches, or open a PR (that is handled for you). Do not touch secrets or destructive production paths.',
    'Implement the smallest change that satisfies the task below, then stop. Keep changes scoped to the task.',
    '',
    `Task: ${packet.issue.identifier} — ${packet.issue.title}${link}`,
    '',
    '--- Full task & Acceptance Criteria ---',
    packet.prompt,
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
      // The Claude CLI writes failures (e.g. "Not logged in") to STDOUT in -p mode,
      // not stderr — surface both so the runner logs the real reason.
      const detail = [outcome.stderr.trim(), outcome.stdout.trim()].filter(Boolean).join(' | ').slice(0, 800)
      return { ok: false, error: `claude exited ${outcome.exitCode}: ${detail || '(no output)'}` }
    }
    return { ok: true }
  }
}
