import { describe, it, expect } from 'vitest'
import { loadHandoffConfig, makeFetchPacket } from './handoff.js'

describe('loadHandoffConfig', () => {
  it('returns config when both vars are present', () => {
    expect(loadHandoffConfig({ HANDOFF_URL: 'https://x/api/cron/linear-handoff', CRON_SECRET: 's' })).toEqual({
      ok: true,
      config: { endpoint: 'https://x/api/cron/linear-handoff', cronSecret: 's' },
    })
  })

  it('trims surrounding whitespace', () => {
    expect(loadHandoffConfig({ HANDOFF_URL: ' https://x ', CRON_SECRET: ' s ' })).toEqual({
      ok: true,
      config: { endpoint: 'https://x', cronSecret: 's' },
    })
  })

  it('fails closed without HANDOFF_URL', () => {
    expect(loadHandoffConfig({ CRON_SECRET: 's' })).toEqual({ ok: false, error: 'HANDOFF_URL is not set' })
  })

  it('fails closed without CRON_SECRET', () => {
    expect(loadHandoffConfig({ HANDOFF_URL: 'https://x' })).toEqual({ ok: false, error: 'CRON_SECRET is not set' })
  })
})

describe('makeFetchPacket', () => {
  it('binds to a zero-arg fetcher', () => {
    expect(typeof makeFetchPacket({ endpoint: 'https://x', cronSecret: 's' })).toBe('function')
  })
})
