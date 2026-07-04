// apps/autopilot-runner/src/wiki-enhance-executor.ts
//
// Tier 2 local executor for task_type 'wiki_enhance': runs the wiki-growth
// SCAN over the local Obsidian vault via headless Claude Code. Scan mode is
// read-only outside the vault's _system/wiki-growth/ sandbox (it writes one
// report file there); promotion of any disposition stays a human act, so this
// executor can never rewrite live knowledge-base pages.
//
// No shell interpolation: the command is a fixed argv array (spawn without a
// shell), the prompt is a constant, and nothing from the job row reaches the
// command line — the job only *selects* this executor.

import { spawn } from 'node:child_process'
import * as os from 'node:os'
import * as path from 'node:path'

export interface WikiEnhanceResult {
  ok: boolean
  summary: string
  evidenceRef?: string
}

export const WIKI_ENHANCE_TIMEOUT_MS = 30 * 60_000 // scan runs take minutes, not hours

// Tools the headless scan may use — mirrors the wiki-growth SKILL.md contract
// (read/search + subagent triage + the sandbox report Write). Nothing else.
const ALLOWED_TOOLS = [
  'Read',
  'Glob',
  'Grep',
  'LS',
  'Write',
  'Agent',
  'Bash(ls:*)',
  'Bash(find:*)',
  'Bash(grep:*)',
  'Bash(wc:*)',
  'Bash(head:*)',
  'Bash(stat:*)',
].join(',')

export function vaultPath(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = (env.WIKI_VAULT_PATH ?? '').trim()
  return fromEnv || path.join(os.homedir(), '2nd Brain', '2nd Brain')
}

/**
 * Run one wiki-growth scan. Resolves (never rejects) with an honest ok/summary;
 * the caller maps it onto job lifecycle + events.
 */
export function runWikiEnhanceScan(env: NodeJS.ProcessEnv = process.env): Promise<WikiEnhanceResult> {
  return new Promise((resolve) => {
    const cwd = vaultPath(env)
    const child = spawn(
      'claude',
      ['-p', '/wiki-growth scan', '--allowedTools', ALLOWED_TOOLS],
      { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] },
    )

    let out = ''
    child.stdout.on('data', (d: Buffer) => {
      out += d.toString()
    })
    child.stderr.on('data', (d: Buffer) => {
      out += d.toString()
    })

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      resolve({ ok: false, summary: `wiki-growth scan timed out after ${WIKI_ENHANCE_TIMEOUT_MS / 60000}m` })
    }, WIKI_ENHANCE_TIMEOUT_MS)

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ ok: false, summary: `could not start claude CLI: ${err.message}` })
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      const reportMatch = out.match(/_system\/wiki-growth\/REPORT-[\w.-]+\.md/)
      const tail = out.trim().split('\n').slice(-3).join(' ').slice(0, 400)
      if (code === 0) {
        resolve({
          ok: true,
          summary: reportMatch
            ? `wiki-growth scan complete — report at ${reportMatch[0]} (review + approve rows to apply)`
            : `wiki-growth scan complete — ${tail}`,
          evidenceRef: reportMatch?.[0],
        })
      } else {
        resolve({ ok: false, summary: `wiki-growth scan exited ${code} — ${tail}` })
      }
    })
  })
}
