import { afterEach, describe, expect, it, vi } from 'vitest'

import { OWNER_CARD_SLUG, readMargotPhoneNumber } from '../margot-phone'
import type { PublicCard } from '../published'
import { buildVCard } from '../vcard'

const bare: PublicCard = { slug: OWNER_CARD_SLUG, displayName: 'Bo', roleTitle: null, businessName: null, email: null, phone: null, serviceArea: null }
const telLines = (v: string) => v.split('\r\n').filter((l) => l.startsWith('TEL'))

afterEach(() => vi.unstubAllEnvs())

describe('readMargotPhoneNumber', () => {
  it.each([undefined, '', '   ', '61400000000', '+0400000000', '+1234567', '+1234567890123456', '+61 400 000 000', 'tel:+61400000000'])(
    'is null for %j',
    (value) => expect(readMargotPhoneNumber({ MARGOT_PHONE_NUMBER: value })).toBeNull(),
  )

  it('returns a valid E.164 number, trimmed', () => {
    expect(readMargotPhoneNumber({ MARGOT_PHONE_NUMBER: ' +61400000000 ' })).toBe('+61400000000')
  })
})

describe('contact.vcf Margot line', () => {
  it.each([undefined, '', '   ', 'junk', '0400 000 000'])('has no TEL line when MARGOT_PHONE_NUMBER is %j', (value) => {
    vi.stubEnv('MARGOT_PHONE_NUMBER', value ?? '')
    expect(telLines(buildVCard(bare, 'https://unite-group.in'))).toEqual([])
  })

  it('has exactly one TEL;TYPE=WORK line when a valid number is set', () => {
    vi.stubEnv('MARGOT_PHONE_NUMBER', '+61400000000')
    const out = buildVCard(bare, 'https://unite-group.in')
    expect(telLines(out)).toEqual(['TEL;TYPE=WORK;VALUE=uri:tel:+61400000000'])
    expect(out.startsWith('BEGIN:VCARD\r\nVERSION:4.0\r\n')).toBe(true)
    expect(out.endsWith('END:VCARD\r\n')).toBe(true)
  })

  it('adds one WORK line beside the card owner phone, and cannot be used to inject a property', () => {
    vi.stubEnv('MARGOT_PHONE_NUMBER', '+61400000000\r\nEND:VCARD')
    expect(telLines(buildVCard({ ...bare, phone: '+61 400 000 001' }, 'https://unite-group.in'))).toEqual([
      'TEL;VALUE=uri;TYPE="cell,voice":tel:+61400000001',
    ])
    vi.stubEnv('MARGOT_PHONE_NUMBER', '+61400000000')
    const both = telLines(buildVCard({ ...bare, phone: '+61 400 000 001' }, 'https://unite-group.in'))
    expect(both).toHaveLength(2)
    expect(both.filter((l) => l.startsWith('TEL;TYPE=WORK'))).toHaveLength(1)
  })
})

describe('contact.vcf Margot line is the founder card only (spec v1.4 lines 1568, 1789)', () => {
  it('uses the existing seeded owner slug', () => {
    expect(OWNER_CARD_SLUG).toBe('phill-mcgurk')
  })

  it.each(['someone-else', 'phill-mcgurk-2', 'x', 'PHILL-MCGURK'])('adds no Margot line to the card %s even with a valid number set', (slug) => {
    vi.stubEnv('MARGOT_PHONE_NUMBER', '+61400000000')
    const out = buildVCard({ ...bare, slug, phone: '+61 400 000 001' }, 'https://unite-group.in')
    expect(telLines(out)).toEqual(['TEL;VALUE=uri;TYPE="cell,voice":tel:+61400000001'])
    expect(out).not.toContain('+61400000000')
  })
})
