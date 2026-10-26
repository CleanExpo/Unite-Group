import { readFileSync } from 'node:fs'

import { describe, it, expect, vi, afterEach } from 'vitest'
import { main } from './index.js'

afterEach(() => vi.restoreAllMocks())

describe('main (entrypoint, non-network paths)', () => {
  it('drains (returns 0) when the kill switch is off', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(await main({})).toBe(0)
    expect(log).toHaveBeenCalledExactlyOnceWith(
      '[autopilot-runner] legacy Linear author/publisher retired; draining with no work claimed.',
    )
  })

  it('rejects the retired live gate before credentials, filesystem, Git, or network can be used', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(await main({
      CC_LINEAR_LIVE: '1',
      CRON_SECRET: 'must-not-be-used',
      GH_RUNNER_PRIVATE_KEY: 'must-not-be-used',
      ANTHROPIC_API_KEY: 'must-not-be-used',
    })).toBe(0)
    expect(log).toHaveBeenCalledExactlyOnceWith(
      '[autopilot-runner] CC_LINEAR_LIVE is permanently retired; no credentials, work, Git, or network were accessed.',
    )
    expect(log.mock.calls.flat().join(' ')).not.toMatch(/must-not-be-used/)
  })

  it('never exits non-zero, so the hosting platform does not mark the tombstone deploy CRASHED (UNI-3017)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    for (const v of ['1', '0', 'true', '']) expect(await main({ CC_LINEAR_LIVE: v })).toBe(0)
  })

  it('keeps the retired entrypoint structurally disconnected from authoring and publication modules', () => {
    const source = readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
    expect(source).not.toMatch(/adapters\/(?:author|exec|git-repo|github|handoff)/)
    expect(source).not.toMatch(/\b(?:fetch|spawn|runOnce|createWorktree|publishBranch)\b/)
  })
})
