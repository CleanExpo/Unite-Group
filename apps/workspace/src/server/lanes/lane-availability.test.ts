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
  probeGatewayBackend,
  probeGatewayProviders,
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

  const seedCodex = (account: string) => {
    const dir = path.join(tmp, 'accounts', account)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'auth.json'), '{}')
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

  it('does not use Claude shared OAuth to admit Codex', () => {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'test-shared-oauth-token'

    expect(cliAccountAvailable('openai-pro', 'codex')).toBe(false)
    expect(cliAccountAvailable('max-1', 'claude-code')).toBe(true)
  })

  it('binds dedicated credentials to the matching CLI tool', () => {
    seed('claude-only')
    seedCodex('codex-only')

    expect(cliAccountAvailable('claude-only', 'claude-code')).toBe(true)
    expect(cliAccountAvailable('claude-only', 'codex')).toBe(false)
    expect(cliAccountAvailable('codex-only', 'codex')).toBe(true)
    expect(cliAccountAvailable('codex-only', 'claude-code')).toBe(false)
  })

  it('rejects account identifiers that escape the credential root', () => {
    const outside = path.join(tmp, 'outside')
    fs.mkdirSync(outside, { recursive: true })
    fs.writeFileSync(path.join(outside, '.credentials.json'), '{}')

    expect(cliAccountHasDedicatedCreds('../outside')).toBe(false)
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

  it('makeAvailabilityCheck gates gateway backends on the probed provider set', () => {
    const down = makeAvailabilityCheck(new Set())
    const up = makeAvailabilityCheck(new Set(['minimax']))
    const gw = { kind: 'gateway' as const, provider: 'minimax', model: '' }
    expect(down(gw)).toBe(false)
    expect(up(gw)).toBe(true)
    expect(
      up({ kind: 'gateway', provider: 'openrouter', model: '' }),
    ).toBe(false)
  })

  it('makeAvailabilityCheck gates CLI backends on dedicated-or-shared', () => {
    seed('max-2')
    const check = makeAvailabilityCheck(new Set(['minimax']))
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

  it('discovers configured providers from the authenticated model catalogue', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            { id: 'minimax/abab6.5', provider: 'minimax' },
            { id: 'openai/gpt-5', owned_by: 'openai' },
          ],
        }),
        { status: 200 },
      ),
    )

    const providers = await probeGatewayProviders(
      'http://127.0.0.1:8642',
      'test-token',
      fetcher,
    )

    expect([...providers]).toEqual(expect.arrayContaining(['minimax', 'openai']))
    expect(fetcher).toHaveBeenCalledWith(
      'http://127.0.0.1:8642/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      }),
    )
  })

  it('fails closed when the requested provider or model is absent', async () => {
    const fetcher = vi.fn().mockImplementation(async () =>
      new Response(
        JSON.stringify({
          data: [{ id: 'minimax/abab6.5', provider: 'minimax' }],
        }),
        { status: 200 },
      ),
    )

    await expect(
      probeGatewayBackend(
        'http://gw',
        { kind: 'gateway', provider: 'openrouter', model: '' },
        undefined,
        fetcher,
      ),
    ).resolves.toBe(false)
    await expect(
      probeGatewayBackend(
        'http://gw',
        { kind: 'gateway', provider: 'minimax', model: 'missing-model' },
        undefined,
        fetcher,
      ),
    ).resolves.toBe(false)
    await expect(
      probeGatewayBackend(
        'http://gw',
        { kind: 'gateway', provider: 'minimax', model: 'minimax/abab6.5' },
        undefined,
        fetcher,
      ),
    ).resolves.toBe(true)
  })
})
