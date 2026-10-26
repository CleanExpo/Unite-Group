import { describe, expect, it } from 'vitest'
import { parseImplicitFragment, safeNextPath } from '../implicit-fragment'

describe('parseImplicitFragment', () => {
  it('extracts both tokens from a Supabase implicit fragment', () => {
    expect(parseImplicitFragment('#access_token=a.b.c&expires_in=3600&refresh_token=r1&token_type=bearer&type=magiclink'))
      .toEqual({ access_token: 'a.b.c', refresh_token: 'r1' })
  })
  it('returns null when a token is missing', () => {
    expect(parseImplicitFragment('#access_token=a.b.c')).toBeNull()
    expect(parseImplicitFragment('')).toBeNull()
    expect(parseImplicitFragment('#error=access_denied')).toBeNull()
  })
})

describe('safeNextPath', () => {
  it('keeps relative paths and rejects open redirects', () => {
    expect(safeNextPath('/founder')).toBe('/founder')
    expect(safeNextPath('//evil.example')).toBe('/founder/command-centre')
    expect(safeNextPath('https://evil.example')).toBe('/founder/command-centre')
    expect(safeNextPath(null)).toBe('/founder/command-centre')
  })
})
