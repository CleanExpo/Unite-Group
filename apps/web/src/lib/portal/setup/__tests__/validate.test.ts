import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ALLOWED_HOSTS, GOOGLE_MAPS_ONLY, validateConnectionValue, validateNotes } from '../validate'

const MIGRATION = readFileSync(
  join(__dirname, '..', '..', '..', '..', '..', 'supabase', 'migrations', '20261102180200_portal_connections.sql'),
  'utf8',
)

/** The quoted names inside one `( ... )` list of the migration. */
function quoted(list: string): string[] {
  return [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort()
}

describe('the database holds the same host rules as the app', () => {
  it('each kind has the same allowed hosts in portal_connection_link_ok', () => {
    for (const [kind, hosts] of Object.entries(ALLOWED_HOSTS)) {
      const match = MIGRATION.match(new RegExp(`when '${kind}' then h in \\(([^)]*)\\)`))
      expect(match, `no SQL host list for ${kind}`).not.toBeNull()
      expect(quoted(match![1]), kind).toEqual([...hosts].sort())
    }
  })

  it('the plain Google hosts need a /maps path in the database too', () => {
    const match = MIGRATION.match(/h not in \(([^)]*)\) or pth like '\/maps%'/)
    expect(match).not.toBeNull()
    expect(quoted(match![1])).toEqual([...GOOGLE_MAPS_ONLY].sort())
  })

  it('the database refuses the same link shapes as the app: plain host, no rewritten path', () => {
    // every https shape in the migration uses the plain-host pattern (no login, port or trailing dot)
    const plainHost = 'https://[A-Za-z0-9-]+([.][A-Za-z0-9-]+)+(/[^[:space:]]*)?'
    // every regex naming a host, minus the one helper that only cuts the path out of an already-checked link
    const shapes = MIGRATION.split('https://[').length - MIGRATION.split('https://[^/?#]+(/[^?#]*)').length
    expect(shapes).toBeGreaterThanOrEqual(4)
    expect(MIGRATION.split(plainHost).length - 1).toBe(shapes)
    expect(MIGRATION).toContain("p_url !~* '\\\\|/([.]|%2e){1,2}([/?#]|$)'")
  })

  it('portal_save_connection checks every profile link with portal_connection_link_ok', () => {
    expect(MIGRATION).toContain('not public.portal_connection_link_ok(p_kind, p_profile_url)')
    expect(MIGRATION).toContain('check (profile_url is null or public.portal_connection_link_ok(kind, profile_url))')
  })
})

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
    ['facebook', 'https://www.facebook.com/.', 'single-dot path (the browser reads it as the home page)'],
    ['facebook', 'https://www.facebook.com/brii/%2E%2e', 'encoded double-dot path'],
    ['gbp', 'https://www.google.com/maps/../search?q=brii', 'Maps path climbing out with ..'],
    ['gbp', 'https://www.google.com/maps\\..\\search', 'backslash path'],
    ['facebook', 'https://www.facebook.com:99999/brii', 'out-of-range port'],
    ['facebook', 'https://www.facebook.com:443/brii', 'any port'],
    ['facebook', 'https://www.facebook.com./brii', 'trailing-dot host'],
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
