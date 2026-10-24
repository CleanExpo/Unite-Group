import { describe, expect, it } from 'vitest'

import { readMargotPhoneNumber } from '../phone-line'

describe('readMargotPhoneNumber', () => {
  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['blank', '   '],
    ['no plus', '61400000000'],
    ['leading zero country code', '+0400000000'],
    ['too short', '+1234567'],
    ['too long', '+1234567890123456'],
    ['letters', '+61abc000000'],
    ['inner spaces', '+61 400 000 000'],
    ['tel prefix', 'tel:+61400000000'],
  ])('returns null for %s', (_name, value) => {
    expect(readMargotPhoneNumber({ MARGOT_PHONE_NUMBER: value })).toBeNull()
  })

  it('returns the number for a valid E.164 value, trimmed', () => {
    expect(readMargotPhoneNumber({ MARGOT_PHONE_NUMBER: ' +61400000000 ' })).toBe('+61400000000')
    expect(readMargotPhoneNumber({ MARGOT_PHONE_NUMBER: '+12345678' })).toBe('+12345678')
    expect(readMargotPhoneNumber({ MARGOT_PHONE_NUMBER: '+123456789012345' })).toBe('+123456789012345')
  })
})
