import { describe, expect, it } from 'vitest'

import { buildVCard, foldLine } from '../vcard'
import type { PublicCard } from '../published'

const card: PublicCard = {
  slug: 'sam-cleaning',
  displayName: 'Sam O’Brien-Zoë',
  roleTitle: 'Owner, lead cleaner; "boss"',
  businessName: "Sam's Cleaning, Pty; Ltd",
  email: 'sam@example.com',
  phone: '+61 400 000 001',
  serviceArea: 'Brisbane\nGold Coast',
}

describe('foldLine', () => {
  it('leaves a short line alone', () => {
    expect(foldLine('FN:Sam')).toBe('FN:Sam')
  })

  it('folds at 75 octets with CRLF + single space, never splitting a multibyte character', () => {
    const line = 'NOTE:' + 'ë'.repeat(100) // 2 bytes each
    const folded = foldLine(line)
    const parts = folded.split('\r\n')
    expect(parts.length).toBeGreaterThan(1)
    for (const [i, p] of parts.entries()) {
      expect(Buffer.byteLength(p, 'utf8')).toBeLessThanOrEqual(75)
      if (i > 0) expect(p.startsWith(' ')).toBe(true)
    }
    const unfolded = parts.map((p, i) => (i === 0 ? p : p.slice(1))).join('')
    expect(unfolded).toBe(line)
    expect(unfolded).not.toContain('�')
  })

  it('folds an ASCII line exactly at 75 octets', () => {
    const parts = foldLine('X:' + 'a'.repeat(200)).split('\r\n')
    expect(Buffer.byteLength(parts[0], 'utf8')).toBe(75)
    expect(Buffer.byteLength(parts[1], 'utf8')).toBe(75)
  })
})

describe('buildVCard', () => {
  const out = buildVCard(card, 'https://unite-group.in')

  it('is vCard 3.0 with CRLF line ends only', () => {
    expect(out.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true)
    expect(out.endsWith('END:VCARD\r\n')).toBe(true)
    expect(out.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
  })

  it('escapes backslash, comma, semicolon and newline', () => {
    expect(out).toContain('ORG:Sam\'s Cleaning\\, Pty\\; Ltd\r\n')
    expect(out).toContain('TITLE:Owner\\, lead cleaner\\; "boss"\r\n')
    expect(out).toContain('NOTE:Service area: Brisbane\\nGold Coast\r\n')
  })

  it('carries the accented name as UTF-8 with an N structure', () => {
    expect(out).toContain('FN:Sam O’Brien-Zoë\r\n')
    expect(out).toContain('N:O’Brien-Zoë;Sam;;;\r\n')
  })

  it('carries phone, email, url and a stable uid', () => {
    expect(out).toContain('TEL;TYPE=CELL,VOICE:+61 400 000 001\r\n')
    expect(out).toContain('EMAIL;TYPE=INTERNET:sam@example.com\r\n')
    expect(out).toContain('URL:https://unite-group.in/c/sam-cleaning\r\n')
    expect(out).toContain('UID:urn:unite-group:card:sam-cleaning\r\n')
    expect(buildVCard(card, 'https://unite-group.in')).toBe(out)
  })

  it('omits empty optional fields', () => {
    const bare = buildVCard({ slug: 'x', displayName: 'Bo', roleTitle: null, businessName: null, email: null, phone: null, serviceArea: null }, 'https://unite-group.in')
    for (const k of ['ORG', 'TITLE', 'TEL', 'EMAIL', 'NOTE']) expect(bare).not.toContain(`\r\n${k}`)
    expect(bare).toContain('FN:Bo\r\n')
    expect(bare).toContain('N:Bo;;;;\r\n')
  })

  it('no emitted line is longer than 75 octets', () => {
    const long = buildVCard({ ...card, roleTitle: 'r'.repeat(300) }, 'https://unite-group.in')
    for (const l of long.split('\r\n')) expect(Buffer.byteLength(l, 'utf8')).toBeLessThanOrEqual(75)
  })

  it('blocks property injection through a newline in a field', () => {
    const evil = buildVCard({ ...card, displayName: 'A\r\nEND:VCARD\r\nBEGIN:VCARD' }, 'https://unite-group.in')
    const lines = evil.split('\r\n')
    expect(lines.filter((l) => l === 'BEGIN:VCARD')).toHaveLength(1)
    expect(lines.filter((l) => l === 'END:VCARD')).toHaveLength(1)
    expect(lines.filter((l) => l.startsWith('FN:'))).toEqual(['FN:A\\nEND:VCARD\\nBEGIN:VCARD'])
  })
})
