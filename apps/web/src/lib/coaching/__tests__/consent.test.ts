import { describe, expect, it } from 'vitest'
import { checkConsent } from '../consent'

const COMPLETE = {
  consent_given: true,
  consent_date: '2026-09-01',
  consent_method: 'written',
  consent_disclosure: 'AI transcription and coaching review',
}

describe('checkConsent', () => {
  it('allows consent only when disclosure is present and nonblank', () => {
    expect(checkConsent(COMPLETE)).toEqual({ allowed: true })
    expect(checkConsent({ ...COMPLETE, consent_disclosure: '  ' })).toEqual({
      allowed: false, reason: 'consent_incomplete_no_disclosure',
    })
  })

  it('fails closed when the engagement is missing', () => {
    expect(checkConsent(null)).toEqual({ allowed: false, reason: 'engagement_not_found' })
  })
})
