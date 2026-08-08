import { describe, expect, it } from 'vitest'
import { getPrivateAccessConfig, hasPrivateAccess, isPrivateAccessConfigured } from '../private-access'

describe('private access allow-list', () => {
  it('fails OPEN in non-production when no allow-list is configured (local-dev ergonomics)', () => {
    const env = { NODE_ENV: 'development' } as NodeJS.ProcessEnv
    expect(hasPrivateAccess({ id: 'any-user', email: 'guest@example.com' }, env)).toBe(true)
    expect(isPrivateAccessConfigured(env)).toBe(false)
  })

  it('fails CLOSED in production when no allow-list is configured (no silent exposure)', () => {
    const env = { NODE_ENV: 'production' } as NodeJS.ProcessEnv
    expect(hasPrivateAccess({ id: 'any-user', email: 'guest@example.com' }, env)).toBe(false)
    // Covers Vercel preview too (also NODE_ENV=production) — an unset FOUNDER_ALLOWED_* must DENY.
    expect(isPrivateAccessConfigured(env)).toBe(false)
  })

  it('allows the configured founder user id', () => {
    const env = { FOUNDER_USER_ID: 'founder-user-id' } as NodeJS.ProcessEnv

    expect(hasPrivateAccess({ id: 'founder-user-id', email: 'other@example.com' }, env)).toBe(true)
    expect(hasPrivateAccess({ id: 'stranger', email: 'other@example.com' }, env)).toBe(false)
  })

  it('allows explicitly invited founder emails case-insensitively', () => {
    const env = { FOUNDER_ALLOWED_EMAILS: 'Phill@Example.com, ops@example.com' } as NodeJS.ProcessEnv

    expect(hasPrivateAccess({ id: 'u1', email: 'phill@example.com' }, env)).toBe(true)
    expect(hasPrivateAccess({ id: 'u2', email: 'OPS@example.com' }, env)).toBe(true)
    expect(hasPrivateAccess({ id: 'u3', email: 'guest@example.com' }, env)).toBe(false)
  })

  it('normalises legacy and new env names into one config', () => {
    const env = {
      FOUNDER_USER_ID: 'primary-id',
      FOUNDER_ALLOWED_USER_IDS: 'id-a, id-b',
      ALLOWED_FOUNDER_EMAILS: 'founder@example.com',
    } as NodeJS.ProcessEnv

    expect(getPrivateAccessConfig(env)).toEqual({
      allowedUserIds: ['id-a', 'id-b'],
      allowedEmails: ['founder@example.com'],
    })
  })
})
