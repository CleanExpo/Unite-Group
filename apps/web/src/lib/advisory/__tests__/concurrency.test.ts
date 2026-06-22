// src/lib/advisory/__tests__/concurrency.test.ts
// Step 2 of the Advisory Debate QA build spec
// (docs/audit-reports/advisory-debate-qa-spec-2026-06-22.md) — the bounded
// concurrency pool that throttles the per-round firm fan-out so all four firms
// no longer hit the rate-limited Claude-Max account at once (F1).
import { describe, it, expect } from 'vitest'

import { allSettledWithConcurrency } from '../debate-engine'

/** A controllable promise — resolve/reject it by hand from the test. */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('allSettledWithConcurrency', () => {
  it('never runs more than `limit` tasks at once and records ≤ cap in-flight', async () => {
    const cap = 2
    let inFlight = 0
    let maxInFlight = 0
    const gates = Array.from({ length: 6 }, () => deferred<void>())

    const tasks = gates.map((gate, i) => async () => {
      inFlight++
      maxInFlight = Math.max(maxInFlight, inFlight)
      await gate.promise
      inFlight--
      return i
    })

    const runPromise = allSettledWithConcurrency(tasks, cap)

    // Let the pool fill up, then release tasks one at a time.
    await Promise.resolve()
    expect(inFlight).toBeLessThanOrEqual(cap)
    for (const gate of gates) {
      gate.resolve()
      await Promise.resolve()
    }

    const results = await runPromise
    expect(maxInFlight).toBeLessThanOrEqual(cap)
    expect(results).toHaveLength(6)
    expect(results.map(r => (r.status === 'fulfilled' ? r.value : null))).toEqual([
      0, 1, 2, 3, 4, 5,
    ])
  })

  it('preserves input order and isolates failures (one rejected, rest fulfilled)', async () => {
    const tasks = [
      async () => 'a',
      async () => {
        throw new Error('boom')
      },
      async () => 'c',
    ]

    const results = await allSettledWithConcurrency(tasks, 2)

    expect(results[0]).toEqual({ status: 'fulfilled', value: 'a' })
    expect(results[1].status).toBe('rejected')
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'c' })
  })

  it('runs every task even when there are more tasks than the cap', async () => {
    const calls: number[] = []
    const tasks = Array.from({ length: 4 }, (_, i) => async () => {
      calls.push(i)
      return i
    })

    const results = await allSettledWithConcurrency(tasks, 1)

    expect(calls.sort()).toEqual([0, 1, 2, 3])
    expect(results.every(r => r.status === 'fulfilled')).toBe(true)
  })

  it('treats a cap below 1 as at least 1 (never deadlocks)', async () => {
    const results = await allSettledWithConcurrency([async () => 'x'], 0)
    expect(results).toEqual([{ status: 'fulfilled', value: 'x' }])
  })
})
