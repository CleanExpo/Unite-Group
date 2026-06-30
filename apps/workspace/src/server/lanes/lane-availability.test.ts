import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cliAccountAvailable,
  cliAccountHasDedicatedCreds,
  cliAccountSource,
  makeAvailabilityCheck,
  probeGateway,
  sharedTokenPresent,
} from './lane-availability'

describe('lane-availability (spec R9)', () => {
  let tmp: string
  let prevHome: string | undefined
  let prevToken: string | undefined

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-acc-'))
    prevHome = process.env.HERMES_HOME
    prevToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
    process.env.HERMES_HOME = tmp
    // Default: no shared token, so dir-based assertions are deterministic.
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN
  })

  afterEach(() => {
    if (prevHome === undefined) delete process.env.HERMES_HOME
    else process.env.HERMES_HOME = prevHome
    if (prevToken === undefined) delete process.env.CLAUDE_CODE_OAUTH_TOKEN
    else process.env.CLAUDE_CODE_OAUTH_TOKEN = prevToken
    fs.rmSync(tmp, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  const seed = (account: string) => {
    const dir = path.join(tmp, 'accounts', account)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, '.credentials.json'), '{}')
  }

  it('unavailable when dir absent and no shared token', () => {
    expect(cliAccountAvailable('max-1')).toBe(false)
    expect(cliAccountSource('max-1')).toBe(null)
  })

  it('unavailable when dir empty and no shared token', () => {
    fs.mkdirSync(path.join(tmp, 'accounts', 'max-1'), { recursive: true })
    expect(cliAccountAvailable('max-1')).toBe(false)
  })

  it('dedicated when its dir has content', () => {
    seed('max-1')
    expect(cliAccountHasDedicatedCreds('max-1')).toBe(true)
    expect(cliAccountAvailable('max-1')).toBe(true)
    expect(cliAccountSource('max-1')).toBe('dedicated')
  })

  it('shared when a CLAUDE_CODE_OAUTH_TOKEN is present but no dir creds', () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'sk-ant-oat-test'
    expect(cliAccountHasDedicatedCreds('max-2')).toBe(false)
    expect(sharedTokenPresent()).toBe(true)
    expect(cliAccountAvailable('max-2')).toBe(true)
    expect(cliAccountSource('max-2')).toBe('shared')
  })

  it('dedicated takes precedence over shared in the source label', () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'sk-ant-oat-test'
    seed('max-1')
    expect(cliAccountSource('max-1')).toBe('dedicated')
  })

  it('a blank token does not count as shared', () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = '   '
    expect(sharedTokenPresent()).toBe(false)
    expect(cliAccountAvailable('max-3')).toBe(false)
  })

  it('makeAvailabilityCheck gates gateway backends on the probed flag', () => {
    const down = makeAvailabilityCheck(false)
    const up = makeAvailabilityCheck(true)
    const gw = { kind: 'gateway' as const, provider: 'minimax', model: '' }
    expect(down(gw)).toBe(false)
    expect(up(gw)).toBe(true)
  })

  it('makeAvailabilityCheck gates CLI backends on dedicated-or-shared', () => {
    seed('max-2')
    const check = makeAvailabilityCheck(true)
    expect(check({ kind: 'cli', tool: 'claude-code', account: 'max-2' })).toBe(
      true,
    )
    // no dir, no token -> unavailable
    expect(check({ kind: 'cli', tool: 'codex', account: 'openai-pro' })).toBe(
      false,
    )
  })

  it('probeGateway returns false when the gateway is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))
    expect(await probeGateway('http://127.0.0.1:6553')).toBe(false)
  })

  it('probeGateway returns true on a 200 health response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"status":"ok"}', { status: 200 }),
    )
    expect(await probeGateway('http://127.0.0.1:8642')).toBe(true)
  })
})
