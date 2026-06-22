// src/lib/advisory/__tests__/retry.test.ts
// Step 1 of the Advisory Debate QA build spec
// (docs/audit-reports/advisory-debate-qa-spec-2026-06-22.md) — the rate-limit-
// aware retry helper that backs callFirmAgentWithRetry / callJudgeAgentWithRetry.
import { vi, describe, it, expect } from 'vitest'

import { callWithRetry } from '../debate-engine'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A 429 error shaped like the Anthropic SDK RateLimitError. */
function rateLimitError(retryAfterSeconds?: number) {
  const err = new Error('429 Too Many Requests') as Error & {
    status?: number
    headers?: Record<string, string>
  }
  err.status = 429
  if (retryAfterSeconds != null) {
    err.headers = { 'retry-after': String(retryAfterSeconds) }
  }
  return err
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('callWithRetry', () => {
  it('honours the retry-after header on a 429 (waits at least that long) then succeeds', async () => {
    const delays: number[] = []
    const sleep = vi.fn(async (ms: number) => {
      delays.push(ms)
    })
    let calls = 0
    const fn = vi.fn(async () => {
      calls++
      if (calls === 1) throw rateLimitError(2)
      return 'ok'
    })

    const result = await callWithRetry(fn, 'firm', { sleep, random: () => 0 })

    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(2)
    // retry-after: 2 → must wait at least 2000ms (not the old fixed 1000ms backoff)
    expect(delays[0]).toBeGreaterThanOrEqual(2000)
  })

  it('adds jitter so two concurrent 429 callers do not retry on the same tick', async () => {
    const recorded: number[] = []
    const sleep = vi.fn(async (ms: number) => {
      recorded.push(ms)
    })
    const makeFn = () => {
      let c = 0
      return vi.fn(async () => {
        c++
        if (c === 1) throw rateLimitError(2)
        return 'ok'
      })
    }

    // Real Math.random → the two callers receive independent jitter and desync.
    await Promise.all([
      callWithRetry(makeFn(), 'firm-a', { sleep }),
      callWithRetry(makeFn(), 'firm-b', { sleep }),
    ])

    expect(recorded).toHaveLength(2)
    expect(recorded[0]).not.toBe(recorded[1]) // jitter present → desynchronised
    expect(recorded[0]).toBeGreaterThanOrEqual(2000)
    expect(recorded[1]).toBeGreaterThanOrEqual(2000)
  })

  it('retries a 429 up to a higher ceiling than a generic error', async () => {
    const sleep = vi.fn(async () => {})

    const fn429 = vi.fn(async () => {
      throw rateLimitError()
    })
    await expect(
      callWithRetry(fn429, 'firm', { sleep, random: () => 0 }),
    ).rejects.toThrow()
    expect(fn429).toHaveBeenCalledTimes(5) // raised 429 ceiling

    const fnGeneric = vi.fn(async () => {
      throw new Error('network blip')
    })
    await expect(
      callWithRetry(fnGeneric, 'firm', { sleep, random: () => 0 }),
    ).rejects.toThrow()
    expect(fnGeneric).toHaveBeenCalledTimes(3) // unchanged non-429 ceiling
  })

  it('does not retry structured-output (Zod/JSON) errors', async () => {
    const sleep = vi.fn(async () => {})
    const fn = vi.fn(async () => {
      throw new Error('ZodError: model output failed validation')
    })

    await expect(
      callWithRetry(fn, 'firm', { sleep }),
    ).rejects.toThrow(/ZodError/)
    expect(fn).toHaveBeenCalledTimes(1) // no retry
  })

  it('retries a transient non-429 error with full-jitter backoff, then succeeds', async () => {
    const sleep = vi.fn(async () => {})
    let c = 0
    const fn = vi.fn(async () => {
      c++
      if (c < 2) throw new Error('transient blip')
      return 'ok'
    })

    const result = await callWithRetry(fn, 'firm', {
      sleep,
      random: () => 0.5,
      baseMs: 1000,
    })

    expect(result).toBe('ok')
    // full jitter on first retry: random(=0.5) * baseMs(1000) * 2^0 = 500
    expect(sleep).toHaveBeenCalledWith(500)
  })
})
