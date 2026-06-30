import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cliAccountAvailable,
  makeAvailabilityCheck,
  probeGateway,
} from './lane-availability'

describe('lane-availability (spec R9)', () => {
  let tmp: string
  let prevHome: string | undefined

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-acc-'))
    prevHome = process.env.HERMES_HOME
    process.env.HERMES_HOME = tmp
  })

  afterEach(() => {
    if (prevHome === undefined) delete process.env.HERMES_HOME
    else process.env.HERMES_HOME = prevHome
    fs.rmSync(tmp, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('reports a CLI account unavailable when its dir is absent', () => {
    expect(cliAccountAvailable('max-1')).toBe(false)
  })

  it('reports a CLI account unavailable when its dir is empty', () => {
    fs.mkdirSync(path.join(tmp, 'accounts', 'max-1'), { recursive: true })
    expect(cliAccountAvailable('max-1')).toBe(false)
  })

  it('reports a CLI account available when its dir has content', () => {
    const dir = path.join(tmp, 'accounts', 'max-1')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, '.credentials.json'), '{}')
    expect(cliAccountAvailable('max-1')).toBe(true)
  })

  it('makeAvailabilityCheck gates gateway backends on the probed flag', () => {
    const down = makeAvailabilityCheck(false)
    const up = makeAvailabilityCheck(true)
    const gw = { kind: 'gateway' as const, provider: 'minimax', model: '' }
    expect(down(gw)).toBe(false)
    expect(up(gw)).toBe(true)
  })

  it('makeAvailabilityCheck gates CLI backends on the account dir', () => {
    const dir = path.join(tmp, 'accounts', 'max-2')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'session'), 'x')
    const check = makeAvailabilityCheck(true)
    expect(
      check({ kind: 'cli', tool: 'claude-code', account: 'max-2' }),
    ).toBe(true)
    expect(
      check({ kind: 'cli', tool: 'codex', account: 'openai-pro' }),
    ).toBe(false)
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
