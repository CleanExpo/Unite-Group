import { describe, expect, it } from 'vitest'

import { validateConnectionValue, validateNotes } from '../validate'

describe('connection link validation', () => {
  const accept: Array<[Parameters<typeof validateConnectionValue>[0], string]> = [
    ['facebook', 'https://www.facebook.com/briitraining'],
    ['instagram', 'https://www.instagram.com/brii.training/'],
    ['linkedin', 'https://www.linkedin.com/company/brii'],
    ['youtube', 'https://www.youtube.com/@briitraining'],
    ['tiktok', 'https://www.tiktok.com/@brii.training'],
    ['x', 'https://x.com/brii'],
    ['x', 'https://twitter.com/brii'],
    ['gbp', 'https://maps.app.goo.gl/abc123'],
    ['gbp', 'https://g.page/r/abc'],
    ['gbp', 'https://www.google.com/maps/place/BRII'],
    ['gsc', 'sc-domain:brii.com.au'],
    ['gsc', 'https://brii.com.au/'],
    ['bing', 'https://brii.com.au/'],
  ]
  it.each(accept)('accepts %s %s', (kind, value) => {
    const r = validateConnectionValue(kind, value)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(kind === 'gsc' || kind === 'bing' ? r.value.propertyId : r.value.profileUrl).toBe(value)
    }
  })

  const refuse: Array<[Parameters<typeof validateConnectionValue>[0], string, string]> = [
    ['facebook', 'http://www.facebook.com/brii', 'http, not https'],
    ['facebook', 'https://user:pw@www.facebook.com/brii', 'credentials in the link'],
    ['facebook', 'https://www.facebook.com@evil.example/brii', 'another host hidden behind @'],
    ['facebook', 'https://evil.example/www.facebook.com/brii', 'wrong host'],
    ['facebook', 'https://facebook.com.evil.example/brii', 'lookalike host'],
    ['instagram', 'https://www.facebook.com/brii', 'right site for a different item'],
    ['facebook', 'https://www.facebook.com/', 'home page, not her page'],
    ['gbp', 'https://www.google.com/search?q=brii', 'Google search, not a Maps profile'],
    ['facebook', 'javascript:alert(1)', 'script link'],
    ['facebook', 'https://www.facebook.com/brii page', 'space inside'],
    ['facebook', `https://www.facebook.com/${'a'.repeat(300)}`, 'too long'],
    ['bing', 'sc-domain:brii.com.au', 'sc-domain is Google only'],
    ['gsc', 'ftp://brii.com.au/', 'not https'],
    ['tiktok', '', 'empty'],
  ]
  it.each(refuse)('refuses %s %s (%s)', (kind, value) => {
    expect(validateConnectionValue(kind, value).ok).toBe(false)
  })

  it('refuses a non-string value', () => {
    expect(validateConnectionValue('x', 42).ok).toBe(false)
    expect(validateConnectionValue('x', null).ok).toBe(false)
  })
})

describe('connection notes', () => {
  it('are optional and trimmed', () => {
    expect(validateNotes('')).toEqual({ ok: true, value: null })
    expect(validateNotes('  Main location  ')).toEqual({ ok: true, value: 'Main location' })
  })

  it('refuse anything shaped like a key or token, and long notes', () => {
    // a long unbroken run of key-like characters; deliberately not shaped like any real provider's key
    expect(validateNotes(`my code is ${'Zq9'.repeat(12)}`).ok).toBe(false)
    expect(validateNotes(`almost ${'Zq9'.repeat(10)}`).ok).toBe(true) // 30 characters: below the threshold
    expect(validateNotes('x'.repeat(501)).ok).toBe(false)
  })
})
