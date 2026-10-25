import { describe, expect, it } from 'vitest'

import { isValidSlug } from '../slug'

describe('card slug', () => {
  it.each(['phill-mcgurk', 'a', 'abc-123', 'a'.repeat(64)])('accepts %s', (s) => {
    expect(isValidSlug(s)).toBe(true)
  })

  it.each([
    '', '../etc', 'Upper', 'a'.repeat(65), 'has space', 'under_score', 'a/b', 'a.vcf', '%2e%2e', 'ｐhill', 'phi̇ll', 'a\nb',
    'admin', 'api', 'studio',
  ])('rejects %j', (s) => {
    expect(isValidSlug(s)).toBe(false)
  })

  it('rejects non-strings', () => {
    expect(isValidSlug(undefined as unknown as string)).toBe(false)
    expect(isValidSlug(null as unknown as string)).toBe(false)
  })
})
