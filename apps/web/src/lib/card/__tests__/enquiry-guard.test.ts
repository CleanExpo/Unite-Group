import { describe, expect, it } from 'vitest'

import {
  MAX_PER_WINDOW, MIN_FILL_MS, MAX_AGE_MS, WINDOW_MS, clientIpFrom, createRateStore, guardEnquiry,
} from '../enquiry-guard'

const NOW = 1_800_000_000_000
const ok = { consent: true, website: '', startedAt: NOW - 10_000 }
const run = (over: Record<string, unknown> = {}, ip = '1.1.1.1', now = NOW, store = createRateStore()) =>
  guardEnquiry({ ...ok, ...over } as never, ip, { now: () => now, store })

describe('guardEnquiry', () => {
  it('lets a consenting, human-paced, empty-honeypot request through', () => {
    expect(run()).toBeNull()
  })

  it('rejects anything but boolean true consent with 400', () => {
    for (const consent of [false, undefined, 'true', 1, 'on', null]) {
      expect(run({ consent })).toMatchObject({ ok: false, status: 400 })
    }
  })

  it('rejects a filled honeypot with a generic 400', () => {
    const r = run({ website: 'http://spam.example' })
    expect(r).toMatchObject({ ok: false, status: 400 })
    expect(JSON.stringify(r)).not.toMatch(/honeypot|bot|website/i)
  })

  it('rejects a non-string honeypot', () => {
    expect(run({ website: 0 })).toMatchObject({ status: 400 })
    expect(run({ website: undefined })).toMatchObject({ status: 400 })
  })

  it('min fill time boundary: just under rejects, exactly at the minimum passes', () => {
    expect(run({ startedAt: NOW - (MIN_FILL_MS - 1) })).toMatchObject({ status: 400 })
    expect(run({ startedAt: NOW - MIN_FILL_MS })).toBeNull()
  })

  it('rejects missing, string, NaN, future and absurdly old startedAt', () => {
    for (const startedAt of [undefined, null, '1799999990000', Number.NaN, Infinity, NOW + 1, NOW + 60_000, NOW - MAX_AGE_MS - 1]) {
      expect(run({ startedAt })).toMatchObject({ ok: false, status: 400 })
    }
    expect(run({ startedAt: NOW - MAX_AGE_MS })).toBeNull()
  })

  it('allows N requests per window and returns 429 on the N+1th', () => {
    const store = createRateStore()
    for (let i = 0; i < MAX_PER_WINDOW; i++) expect(run({}, '2.2.2.2', NOW, store)).toBeNull()
    expect(run({}, '2.2.2.2', NOW, store)).toMatchObject({ ok: false, status: 429 })
  })

  it('frees the caller once the window has expired', () => {
    const store = createRateStore()
    for (let i = 0; i < MAX_PER_WINDOW; i++) run({}, '2.2.2.2', NOW, store)
    expect(run({}, '2.2.2.2', NOW + WINDOW_MS - 1, store)).toMatchObject({ status: 429 })
    expect(run({ startedAt: NOW + WINDOW_MS - 10_000 }, '2.2.2.2', NOW + WINDOW_MS, store)).toBeNull()
  })

  it('keeps distinct IPs independent', () => {
    const store = createRateStore()
    for (let i = 0; i < MAX_PER_WINDOW; i++) run({}, '3.3.3.3', NOW, store)
    expect(run({}, '3.3.3.3', NOW, store)).toMatchObject({ status: 429 })
    expect(run({}, '4.4.4.4', NOW, store)).toBeNull()
  })

  it('rejected requests (bad consent/honeypot/timing) do not consume the caller\'s allowance', () => {
    const store = createRateStore()
    for (let i = 0; i < MAX_PER_WINDOW * 2; i++) run({ consent: false }, '5.5.5.5', NOW, store)
    expect(run({}, '5.5.5.5', NOW, store)).toBeNull()
  })

  it('a missing IP shares one deliberate "unknown" bucket rather than bypassing the limit', () => {
    const store = createRateStore()
    for (let i = 0; i < MAX_PER_WINDOW; i++) expect(run({}, null, NOW, store)).toBeNull()
    expect(run({}, null, NOW, store)).toMatchObject({ status: 429 })
    expect(run({}, '', NOW, store)).toMatchObject({ status: 429 })
  })

  it('bounds the store: many distinct IPs cannot grow it past its cap', () => {
    const store = createRateStore(50)
    for (let i = 0; i < 500; i++) run({}, `10.0.${Math.floor(i / 250)}.${i % 250}`, NOW, store)
    expect(store.size()).toBeLessThanOrEqual(50)
  })

  it('a full store evicts one old entry, so a new address cannot reset a limited caller', () => {
    const store = createRateStore(3)
    run({}, '9.9.9.1', NOW, store) // oldest entry, the one to go
    for (let i = 0; i < MAX_PER_WINDOW; i++) run({}, '6.6.6.6', NOW, store)
    run({}, '9.9.9.2', NOW, store) // store now full
    run({}, '9.9.9.3', NOW, store) // a new address arrives
    expect(store.size()).toBe(3)
    expect(run({}, '6.6.6.6', NOW, store)).toMatchObject({ status: 429 })
  })
})

describe('clientIpFrom', () => {
  const h = (o: Record<string, string>) => new Headers(o)
  it('prefers the platform header, then the first x-forwarded-for hop, then x-real-ip', () => {
    expect(clientIpFrom(h({ 'x-vercel-forwarded-for': '9.9.9.9', 'x-forwarded-for': '1.1.1.1' }))).toBe('9.9.9.9')
    expect(clientIpFrom(h({ 'x-forwarded-for': ' 1.1.1.1 , 2.2.2.2, 3.3.3.3' }))).toBe('1.1.1.1')
    expect(clientIpFrom(h({ 'x-real-ip': '7.7.7.7' }))).toBe('7.7.7.7')
    expect(clientIpFrom(h({}))).toBeNull()
  })
})
