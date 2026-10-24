import { describe, expect, it } from 'vitest'

import { CARD_TIERS } from '@/app/cards/order/order-view'
import { cardOrderReference, matchCardTier } from '../paid-order'

// Test-mode fixture shapes only; nothing here is a real Stripe object or payment.
const session = (over: Record<string, unknown> = {}) =>
  ({ id: 'cs_test_a1', amount_total: 24900, currency: 'aud', client_reference_id: 'ref_abc123', ...over }) as never

describe('matchCardTier', () => {
  it('matches each CARD_TIERS price in AUD cents', () => {
    for (const t of CARD_TIERS) {
      expect(matchCardTier(session({ amount_total: t.priceAud * 100 }))?.id).toBe(t.id)
    }
  })

  it.each([
    ['another amount', { amount_total: 24800 }],
    ['another currency', { currency: 'usd' }],
    ['no amount', { amount_total: null }],
  ])('returns null for %s', (_n, over) => {
    expect(matchCardTier(session(over))).toBeNull()
  })
})

describe('cardOrderReference', () => {
  it('takes client_reference_id, trimmed', () => {
    expect(cardOrderReference(session({ client_reference_id: '  ref_abc123 ' }))).toBe('ref_abc123')
  })
  it('falls back to the checkout session id when there is none', () => {
    expect(cardOrderReference(session({ client_reference_id: null }))).toBe('cs_test_a1')
  })
})
