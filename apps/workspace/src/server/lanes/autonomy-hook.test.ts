import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { actionHash } from './autonomy-gate'
import { parseGateAudit } from './autonomy-settings'
import type { ToolCallRequest } from './autonomy-gate'

const execFileAsync = promisify(execFile)
const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), 'autonomy-hook.mjs')

const ALLOW = 0
const BLOCK = 2

let root = ''
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'autonomy-hook-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

interface HookResult {
  code: number
  stderr: string
}

/**
 * Run the hook exactly as Claude Code does: real subprocess, JSON on stdin,
 * decision carried by the EXIT CODE.
 *
 * Unit-testing the classifier proves the classifier. Only this proves the
 * hook — that a denial actually leaves the process with code 2, which is the
 * single fact the CLI acts on. A hook that classifies perfectly and exits 1
 * lets the tool run.
 */
async function runHook(
  payload: unknown,
  env: NodeJS.ProcessEnv = {},
): Promise<HookResult> {
  const child = execFileAsync(process.execPath, [HOOK], {
    env: {
      PATH: process.env.PATH,
      NEXUS_LANE_REQUEST_ID: 'run-1',
      NEXUS_LANE_ADAPTER: 'claude-code',
      ...env,
    },
  })
  child.child.stdin?.end(typeof payload === 'string' ? payload : JSON.stringify(payload))
  try {
    const { stderr } = await child
    return { code: ALLOW, stderr }
  } catch (error) {
    const failure = error as { code?: number; stderr?: string }
    return { code: failure.code ?? -1, stderr: failure.stderr ?? '' }
  }
}

describe('the hook allows what the ladder allows', () => {
  it('exits 0 for a read-only shell command', async () => {
    const result = await runHook({ tool_name: 'Bash', tool_input: { command: 'ls -la' } })
    expect(result.code).toBe(ALLOW)
  })

  it('exits 0 for a read-only tool', async () => {
    const result = await runHook({
      tool_name: 'Read',
      tool_input: { file_path: '/repo/src/index.ts' },
    })
    expect(result.code).toBe(ALLOW)
  })

  it('exits 0 for a worktree-local write', async () => {
    const result = await runHook({ tool_name: 'Edit', tool_input: { file_path: 'src/a.ts' } })
    expect(result.code).toBe(ALLOW)
  })
})

describe('the hook blocks with exit 2, the only code the CLI treats as denial', () => {
  const blocked: Array<[string, unknown]> = [
    ['a push', { tool_name: 'Bash', tool_input: { command: 'git push origin main' } }],
    ['chained commands', { tool_name: 'Bash', tool_input: { command: 'ls; rm -rf /' } }],
    ['a script runner', { tool_name: 'Bash', tool_input: { command: 'bash deploy.sh' } }],
    ['a secret read', { tool_name: 'Bash', tool_input: { command: 'cat .env' } }],
    ['an unknown executable', { tool_name: 'Bash', tool_input: { command: 'deploy --yes' } }],
    ['an unknown tool', { tool_name: 'mcp__vendor__ship_it', tool_input: {} }],
    ['an outward fetch with no stamp', { tool_name: 'WebFetch', tool_input: { url: 'https://x.test' } }],
  ]

  it.each(blocked)('blocks %s', async (_label, payload) => {
    const result = await runHook(payload)
    expect(result.code).toBe(BLOCK)
    expect(result.stderr).toMatch(/Autonomy gate BLOCKED/)
  })

  it('explains the block without echoing the arguments', async () => {
    // A blocked call is often blocked BECAUSE it touches credential material.
    const result = await runHook({
      tool_name: 'Bash',
      tool_input: { command: 'cat .env.production' },
    })
    expect(result.code).toBe(BLOCK)
    expect(result.stderr).not.toContain('.env.production')
    expect(result.stderr).toMatch(/credential material/i)
  })
})

describe('the hook fails closed', () => {
  it('blocks on empty stdin', async () => {
    const result = await runHook('')
    expect(result.code).toBe(BLOCK)
  })

  it('blocks on malformed JSON', async () => {
    const result = await runHook('{not json')
    expect(result.code).toBe(BLOCK)
    expect(result.stderr).toMatch(/malformed/i)
  })

  it('blocks on a non-object payload', async () => {
    expect((await runHook('[]')).code).toBe(BLOCK)
    expect((await runHook('42')).code).toBe(BLOCK)
  })

  it('blocks when the request id is not set', async () => {
    const result = await runHook(
      { tool_name: 'Bash', tool_input: { command: 'ls' } },
      { NEXUS_LANE_REQUEST_ID: '' },
    )
    expect(result.code).toBe(BLOCK)
    expect(result.stderr).toMatch(/request id/i)
  })

  it('blocks when the adapter is unrecognised', async () => {
    const result = await runHook(
      { tool_name: 'Bash', tool_input: { command: 'ls' } },
      { NEXUS_LANE_ADAPTER: 'something-else' },
    )
    expect(result.code).toBe(BLOCK)
    expect(result.stderr).toMatch(/adapter/i)
  })

  it('blocks when the approvals file exists but cannot be parsed', async () => {
    // Unreadable approvals are an UNKNOWN state, not "no approvals". Treating
    // them as empty would be safe here by luck, but the same reasoning applied
    // to a permissive default is how gates fail open.
    const approvals = path.join(root, 'approvals.json')
    await writeFile(approvals, '{not json')
    const result = await runHook(
      { tool_name: 'Bash', tool_input: { command: 'ls' } },
      { NEXUS_APPROVALS_FILE: approvals },
    )
    expect(result.code).toBe(BLOCK)
    expect(result.stderr).toMatch(/approval state/i)
  })

  it('still allows a safe call when the approvals file is simply absent', async () => {
    const result = await runHook(
      { tool_name: 'Bash', tool_input: { command: 'ls' } },
      { NEXUS_APPROVALS_FILE: path.join(root, 'missing.json') },
    )
    expect(result.code).toBe(ALLOW)
  })

  it('blocks a tool call with no tool name', async () => {
    expect((await runHook({ tool_input: { command: 'ls' } })).code).toBe(BLOCK)
  })
})

describe('approvals reach the hook from the operator file, never the payload', () => {
  const request: ToolCallRequest = {
    tool: 'Bash',
    input: { command: 'git push origin feature' },
    adapter: 'claude-code',
    requestId: 'run-1',
  }
  const payload = { tool_name: 'Bash', tool_input: { command: 'git push origin feature' } }

  it('allows an L3 action approved for this exact action', async () => {
    const approvals = path.join(root, 'approvals.json')
    await writeFile(
      approvals,
      JSON.stringify([
        {
          requestId: 'run-1',
          actionHash: actionHash(request),
          grantedBy: 'phill',
          expiresAt: Date.now() + 60_000,
        },
      ]),
    )
    expect((await runHook(payload, { NEXUS_APPROVALS_FILE: approvals })).code).toBe(ALLOW)
  })

  it('refuses to let that approval cover a different command', async () => {
    const approvals = path.join(root, 'approvals.json')
    await writeFile(
      approvals,
      JSON.stringify([
        {
          requestId: 'run-1',
          actionHash: actionHash(request),
          grantedBy: 'phill',
          expiresAt: Date.now() + 60_000,
        },
      ]),
    )
    const other = { tool_name: 'Bash', tool_input: { command: 'git push origin main --force' } }
    expect((await runHook(other, { NEXUS_APPROVALS_FILE: approvals })).code).toBe(BLOCK)
  })

  it('ignores an approval smuggled inside the tool payload', async () => {
    // A tool call that could carry its own approval is a tool call that can
    // approve itself.
    const smuggled = {
      tool_name: 'Bash',
      tool_input: { command: 'git push origin main' },
      approvals: [
        {
          requestId: 'run-1',
          actionHash: actionHash({ ...request, input: { command: 'git push origin main' } }),
          grantedBy: 'self',
          expiresAt: Date.now() + 60_000,
        },
      ],
    }
    expect((await runHook(smuggled)).code).toBe(BLOCK)
  })

  it('refuses an expired approval', async () => {
    const approvals = path.join(root, 'approvals.json')
    await writeFile(
      approvals,
      JSON.stringify([
        {
          requestId: 'run-1',
          actionHash: actionHash(request),
          grantedBy: 'phill',
          expiresAt: Date.now() - 1_000,
        },
      ]),
    )
    expect((await runHook(payload, { NEXUS_APPROVALS_FILE: approvals })).code).toBe(BLOCK)
  })
})

describe('decisions are recorded for Mission Control', () => {
  it('appends both allowed and blocked decisions', async () => {
    const audit = path.join(root, 'decisions.jsonl')
    await runHook({ tool_name: 'Bash', tool_input: { command: 'ls' } }, { NEXUS_GATE_AUDIT_FILE: audit })
    await runHook(
      { tool_name: 'Bash', tool_input: { command: 'git push' } },
      { NEXUS_GATE_AUDIT_FILE: audit },
    )
    const records = parseGateAudit(await readFile(audit, 'utf8'))
    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({ tier: 'L0', allowed: true })
    expect(records[1]).toMatchObject({ tier: 'L3', allowed: false })
    expect(records[1]?.reason).toMatch(/approval/i)
  })

  it('keeps the recorded summary free of the blocked arguments', async () => {
    const audit = path.join(root, 'decisions.jsonl')
    await runHook(
      { tool_name: 'Bash', tool_input: { command: 'cat ~/.ssh/id_rsa' } },
      { NEXUS_GATE_AUDIT_FILE: audit },
    )
    const raw = await readFile(audit, 'utf8')
    expect(raw).not.toContain('id_rsa')
    expect(parseGateAudit(raw)[0]?.safeSummary).toContain('L3')
  })

  it('does not fail open when the audit file cannot be written', async () => {
    // An unwritable log must not become a way to make the gate permissive.
    const result = await runHook(
      { tool_name: 'Bash', tool_input: { command: 'git push' } },
      { NEXUS_GATE_AUDIT_FILE: '/nonexistent-dir/decisions.jsonl' },
    )
    expect(result.code).toBe(BLOCK)
  })
})
