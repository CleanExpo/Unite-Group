import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  autonomyEnv,
  autonomyHookPath,
  buildAutonomySettings,
  parseGateAudit,
  quote,
} from './autonomy-settings'
import { prepareLaneGate } from './index'

let root = ''
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'autonomy-settings-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('the hook is installed on every tool', () => {
  it('matches everything, not a list of tools we already distrust', () => {
    // A matcher listing "dangerous" tools is the deny-list mistake one level
    // up: an MCP tool, a plugin, or a tool a CLI upgrade adds would never reach
    // the classifier, so the gate would be absent for exactly the tools nobody
    // has vetted.
    const settings = buildAutonomySettings('/hook.mjs', '/node')
    expect(settings.hooks.PreToolUse).toHaveLength(1)
    expect(settings.hooks.PreToolUse[0]?.matcher).toBe('.*')
  })

  it('invokes the hook with an absolute interpreter', () => {
    // A PATH-resolved `node` could be shadowed by the lane's own worktree.
    const command = buildAutonomySettings('/hook.mjs', '/abs/node').hooks.PreToolUse[0]?.hooks[0]
      ?.command
    expect(command).toBe(`'/abs/node' '/hook.mjs'`)
    expect(command?.startsWith(`'/abs/node'`)).toBe(true)
  })

  it('points at a hook file that actually exists', () => {
    // A settings file naming a missing hook installs nothing, and the lane runs
    // ungated while looking configured.
    expect(existsSync(autonomyHookPath())).toBe(true)
  })

  it('quotes a path containing a single quote', () => {
    expect(quote(`/a'b`)).toBe(`'/a'\\''b'`)
  })
})

describe('hook environment', () => {
  it('carries the request identity and adapter', () => {
    expect(autonomyEnv({ requestId: 'run-1', adapter: 'claude-code' })).toEqual({
      NEXUS_LANE_REQUEST_ID: 'run-1',
      NEXUS_LANE_ADAPTER: 'claude-code',
    })
  })

  it('omits optional paths rather than passing empty strings', () => {
    const env = autonomyEnv({ requestId: 'run-1', adapter: 'codex' })
    expect(env.NEXUS_APPROVALS_FILE).toBeUndefined()
    expect(env.NEXUS_GATE_AUDIT_FILE).toBeUndefined()
  })

  it('passes the approvals and audit paths when given', () => {
    expect(
      autonomyEnv({
        requestId: 'run-1',
        adapter: 'claude-code',
        approvalsFile: '/a.json',
        auditFile: '/d.jsonl',
      }),
    ).toMatchObject({ NEXUS_APPROVALS_FILE: '/a.json', NEXUS_GATE_AUDIT_FILE: '/d.jsonl' })
  })
})

describe('prepareLaneGate', () => {
  it('writes a settings file scoped to one run', async () => {
    const wiring = await prepareLaneGate(root, { runId: 'run-1', laneId: 'lane-1' })
    expect(wiring.requestId).toBe('run-1')
    const settings = JSON.parse(await readFile(wiring.settingsPath, 'utf8'))
    expect(settings.hooks.PreToolUse[0].matcher).toBe('.*')
  })

  it('scopes approvals per run, so one run cannot inherit another run approval', async () => {
    const first = await prepareLaneGate(root, { runId: 'run-1', laneId: 'lane-1' })
    const second = await prepareLaneGate(root, { runId: 'run-2', laneId: 'lane-1' })
    expect(first.approvalsPath).not.toBe(second.approvalsPath)
    expect(first.auditPath).not.toBe(second.auditPath)
  })

  it('throws rather than returning an ungated wiring when it cannot write', async () => {
    // A lane that quietly proceeds ungated because setup failed is the exact
    // fail-open this ticket exists to prevent.
    await expect(
      prepareLaneGate('/nonexistent-root-xyz', { runId: 'run-1', laneId: 'lane-1' }),
    ).rejects.toThrow()
  })
})

describe('gate audit parsing', () => {
  it('reads the decisions the hook recorded', () => {
    const raw = [
      JSON.stringify({ at: 'now', requestId: 'r', adapter: 'claude-code', tier: 'L3', allowed: false, safeSummary: 'L3 · Bash', reason: 'x', failedClosed: false }),
      JSON.stringify({ at: 'now', requestId: 'r', adapter: 'claude-code', tier: 'L0', allowed: true, safeSummary: 'L0 · Read', reason: 'y', failedClosed: false }),
    ].join('\n')
    expect(parseGateAudit(raw)).toHaveLength(2)
  })

  it('skips a corrupt line rather than blanking the whole audit view', () => {
    // Unlike the run ledger, this is read for display: refusing to show ANY
    // decision because one line is corrupt would hide the blocks it exists to
    // surface.
    const good = JSON.stringify({ at: 'now', requestId: 'r', adapter: 'a', tier: 'L3', allowed: false, safeSummary: 's', reason: 'x', failedClosed: false })
    expect(parseGateAudit(`{oops\n${good}\n`)).toHaveLength(1)
  })

  it('ignores a well-formed line that is not a decision', () => {
    expect(parseGateAudit(JSON.stringify({ hello: 'world' }))).toEqual([])
  })
})
