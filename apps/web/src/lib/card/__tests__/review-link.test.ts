import { describe, expect, it } from 'vitest'

import { buildGoogleReviewUrl, classifyUserAgent, isValidPlaceId, normalisePlaceIdInput, requestIdFrom } from '../review-link'

const REAL_SHAPE = 'ChIJN1t_tDeuEmsRUsoyG83frY4'

describe('Google review link builder', () => {
  it('builds the writereview URL for a well-formed Place ID', () => {
    expect(buildGoogleReviewUrl(REAL_SHAPE)).toBe(`https://search.google.com/local/writereview?placeid=${REAL_SHAPE}`)
  })

  it('refuses anything that is not a Place ID shape, so no other URL can be smuggled in', () => {
    for (const bad of [
      null, undefined, 42, '', 'short', 'has space in it ok', 'ChIJ&placeid=evil', 'ChIJ/../../x123', 'https://evil.example/x',
      'ChIJ%20encoded', 'ChIJ\nnewline12', 'x'.repeat(301),
    ]) {
      expect(isValidPlaceId(bad)).toBe(false)
      expect(buildGoogleReviewUrl(bad)).toBeNull()
    }
  })

  it('accepts the length bounds the database accepts (10 to 300)', () => {
    expect(isValidPlaceId('a'.repeat(10))).toBe(true)
    expect(isValidPlaceId('a'.repeat(9))).toBe(false)
    expect(isValidPlaceId('a'.repeat(300))).toBe(true)
    expect(isValidPlaceId('a'.repeat(301))).toBe(false)
  })

  it('always points at google.com, whatever the id', () => {
    const u = new URL(buildGoogleReviewUrl('A-b_C' + '9'.repeat(20))!)
    expect(u.origin).toBe('https://search.google.com')
    expect(u.pathname).toBe('/local/writereview')
    expect([...u.searchParams.keys()]).toEqual(['placeid'])
  })

  it('normalises owner input: blank clears, padding is trimmed, junk is invalid', () => {
    expect(normalisePlaceIdInput('   ')).toBeNull()
    expect(normalisePlaceIdInput(null)).toBeNull()
    expect(normalisePlaceIdInput(`  ${REAL_SHAPE} `)).toBe(REAL_SHAPE)
    expect(normalisePlaceIdInput('not a place id!')).toBe('invalid')
    expect(normalisePlaceIdInput(7)).toBe('invalid')
  })
})

describe('tap metadata carries no personal data', () => {
  it('reduces a user agent to a coarse class and drops link previewers', () => {
    expect(classifyUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('mobile')
    expect(classifyUserAgent('Mozilla/5.0 (Linux; Android 15) Mobile')).toBe('mobile')
    expect(classifyUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)')).toBe('desktop')
    expect(classifyUserAgent('WhatsApp/2.24')).toBe('bot')
    expect(classifyUserAgent('Googlebot/2.1')).toBe('bot')
    expect(classifyUserAgent('facebookexternalhit/1.1')).toBe('bot')
    expect(classifyUserAgent(null)).toBeNull()
  })

  it('accepts only a uuid as a request id', () => {
    expect(requestIdFrom('6F1E2D3C-4B5A-4987-8a7b-6c5d4e3f2a1b')).toBe('6f1e2d3c-4b5a-4987-8a7b-6c5d4e3f2a1b')
    expect(requestIdFrom('0412345678')).toBeNull()
    expect(requestIdFrom('sam@example.com')).toBeNull()
    expect(requestIdFrom(null)).toBeNull()
  })
})
