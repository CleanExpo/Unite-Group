import { describe, expect, it } from 'vitest'
import {
  normaliseHarnessState,
  normaliseHermesSession,
} from './harness-api'

describe('harness adapter', () => {
  it('does not infer active work from an old session', () => {
    const now = Date.parse('2026-08-27T10:00:00Z')
    expect(
      normaliseHarnessState(
        {
          key: 'old',
          status: 'idle',
          updatedAt: now - 10 * 60_000,
        },
        now,
      ),
    ).toBe('idle')
  })

  it('treats recent runtime activity as active when status is ambiguous', () => {
    const now = Date.parse('2026-08-27T10:00:00Z')
    expect(
      normaliseHarnessState(
        {
          key: 'recent',
          status: 'unknown',
          updatedAt: now - 15_000,
        },
        now,
      ),
    ).toBe('active')
  })

  it('preserves explicit failures instead of painting them green', () => {
    expect(
      normaliseHarnessState({ key: 'broken', status: 'failed' }),
    ).toBe('error')
  })

  it('normalises Hermes into the vendor-neutral Mission Control contract', () => {
    const now = Date.parse('2026-08-27T10:00:00Z')
    const session = normaliseHermesSession(
      {
        key: 'agent:forge',
        label: 'Forge',
        model: 'anthropic/claude-sonnet-4-6',
        status: 'running',
        task: 'Repair production build',
        updatedAt: now,
        totalTokens: 1234,
      },
      now,
    )

    expect(session.provider).toBe('hermes')
    expect(session.id).toBe('agent:forge')
    expect(session.state).toBe('active')
    expect(session.task).toBe('Repair production build')
    expect(session.tokenCount).toBe(1234)
  })
})
