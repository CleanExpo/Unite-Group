// src/lib/__tests__/businesses.test.ts
import {
  BUSINESSES,
  CLIENT_BUSINESSES,
  OWNED_BUSINESSES,
  isOwnedBusinessKey,
} from '../businesses'

describe('BUSINESSES', () => {
  it('has 8 entries', () => {
    expect(BUSINESSES).toHaveLength(8)
  })

  it('each entry has key, name, color, status, type', () => {
    for (const biz of BUSINESSES) {
      expect(biz).toMatchObject({
        key: expect.any(String),
        name: expect.any(String),
        color: expect.stringMatching(/^#[0-9a-f]{6}$/i),
        status: expect.stringMatching(/^(active|planning)$/),
        type: expect.stringMatching(/^(owned|client)$/),
      })
    }
  })

  it('all businesses are active', () => {
    expect(BUSINESSES.every(b => b.status === 'active')).toBe(true)
  })

  it('CCW is the only client-type business', () => {
    expect(CLIENT_BUSINESSES).toHaveLength(1)
    expect(CLIENT_BUSINESSES[0].key).toBe('ccw')
  })

  it('has 7 owned business keys (dr and nrpg are separate keys for one business entity)', () => {
    expect(OWNED_BUSINESSES).toHaveLength(7)
  })

  it('keeps CCW out of owned-bookkeeping helpers', () => {
    expect(isOwnedBusinessKey('ccw')).toBe(false)
    expect(isOwnedBusinessKey('carsi')).toBe(true)
    expect(OWNED_BUSINESSES.map((business) => business.key)).toEqual([
      'dr',
      'nrpg',
      'carsi',
      'restore',
      'synthex',
      'ato',
      'itr',
    ])
  })
})
