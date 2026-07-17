import { describe, expect, it } from 'vitest'
import {
  assertBackendAvailable,
  listBackends,
  resolveCliAccount,
} from './backend-registry'
import { makeAvailabilityCheck } from './lane-availability'
import type { LaneBackend } from './types'

describe('BackendRegistry', () => {
  it('resolves a role to its pinned Claude Code account', () => {
    expect(resolveCliAccount('builder')).toBe('max-1')
    expect(resolveCliAccount('reviewer')).toBe('max-2')
    expect(resolveCliAccount('research')).toBe('max-3')
  })

  it('lists gateway + cli backends with availability flags', () => {
    const gatewayProviders = new Set(['minimax'])
    const all = listBackends(
      makeAvailabilityCheck(gatewayProviders),
      (provider) => gatewayProviders.has(provider),
    )
    expect(all.find((d) => d.id === 'gateway:minimax')?.available).toBe(true)
    expect(all.find((d) => d.id === 'gateway:openrouter')?.available).toBe(
      false,
    )
    expect(all.some((d) => d.id.startsWith('cli:claude-code:max-1'))).toBe(true)
    expect(all.find((d) => d.id.startsWith('cli:codex'))?.available).toBe(false)
  })

  it('asserts availability with a clear, user-facing reason', () => {
    const backend: LaneBackend = {
      kind: 'gateway',
      provider: 'minimax',
      model: '',
    }
    expect(() => assertBackendAvailable(backend, () => false)).toThrow(
      /not configured/,
    )
    expect(() => assertBackendAvailable(backend, () => true)).not.toThrow()
  })
})
