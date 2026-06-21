import { describe, it, expect } from 'vitest'
import { resolveEnvKey, hasEnvKey, PROVIDER_ENV_CANDIDATES } from '../credentials'

describe('resolveEnvKey', () => {
  it('reads the first present candidate', () => {
    expect(resolveEnvKey('minimax', { MINIMAX_API_KEY: 'k1' })).toBe('k1')
  })
  it('falls through to the next candidate (MINIMAX_PREPAID)', () => {
    expect(resolveEnvKey('minimax', { MINIMAX_PREPAID: 'k2' })).toBe('k2')
    expect(PROVIDER_ENV_CANDIDATES.minimax).toContain('MINIMAX_PREPAID')
  })
  it('is null when no candidate is set or value is empty', () => {
    expect(resolveEnvKey('minimax', {})).toBeNull()
    expect(resolveEnvKey('minimax', { MINIMAX_API_KEY: '' })).toBeNull()
  })
})

describe('hasEnvKey', () => {
  it('reflects presence only', () => {
    expect(hasEnvKey('openrouter', { OPENROUTER_API_KEY: 'x' })).toBe(true)
    expect(hasEnvKey('openrouter', {})).toBe(false)
  })
})
