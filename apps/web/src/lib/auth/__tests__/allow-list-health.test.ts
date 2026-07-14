import { describe, expect, it } from 'vitest'
import { evaluateAllowListHealth, STALE_SIGN_IN_DAYS, type AllowListAuthUser } from '../allow-list-health'

const NOW = new Date('2026-07-14T10:00:00Z')

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

const founder: AllowListAuthUser = {
  id: 'c3f32c79-0d4a-4607-a906-ba8ca08e83b6',
  email: 'founder@example.com',
  lastSignInAt: daysAgo(0),
}

const legacyAccount: AllowListAuthUser = {
  id: '70608186-a487-4efb-ae8a-71bd0dbfa151',
  email: 'legacy@example.com',
  lastSignInAt: null,
}

describe('evaluateAllowListHealth', () => {
  it('is green when an allow-listed identity exists and signed in recently', () => {
    const health = evaluateAllowListHealth(
      { allowedUserIds: [founder.id], allowedEmails: ['founder@example.com'] },
      [founder, legacyAccount],
      NOW,
    )
    expect(health.status).toBe('green')
    expect(health.matchedEntries).toBe(1)
    expect(health.staleEntries).toEqual([])
    expect(health.daysSinceAllowedSignIn).toBe(0)
  })

  it('is yellow when unconfigured, because private access is fail-open', () => {
    const health = evaluateAllowListHealth(
      { allowedUserIds: [], allowedEmails: [] },
      [founder],
      NOW,
    )
    expect(health.status).toBe('yellow')
    expect(health.detail).toContain('fail-open')
  })

  it('replicates the 2026-07-14 incident: allow-list names a real but dormant account → yellow', () => {
    // FOUNDER_USER_ID pointed at the legacy account, which exists but never
    // signs in — the real founder was locked out. Sign-in staleness is the
    // detectable signal.
    const health = evaluateAllowListHealth(
      { allowedUserIds: [legacyAccount.id], allowedEmails: [] },
      [founder, legacyAccount],
      NOW,
    )
    expect(health.status).toBe('yellow')
    expect(health.detail).toContain('NEVER signed in')
  })

  it('is red when no entry matches any auth user (stale UID or \\r\\n corruption)', () => {
    const health = evaluateAllowListHealth(
      // Literal \r\n suffix — the Windows `vercel env add` corruption.
      { allowedUserIds: [`${founder.id}\\r\\n`], allowedEmails: [] },
      [founder, legacyAccount],
      NOW,
    )
    expect(health.status).toBe('red')
    expect(health.matchedEntries).toBe(0)
    expect(health.staleEntries).toHaveLength(1)
    expect(health.detail).toContain('locked out')
  })

  it('is yellow when access works but some entries are stale', () => {
    const health = evaluateAllowListHealth(
      { allowedUserIds: [founder.id, 'no-such-user'], allowedEmails: [] },
      [founder],
      NOW,
    )
    expect(health.status).toBe('yellow')
    expect(health.matchedEntries).toBe(1)
    expect(health.staleEntries).toEqual(['no-such-user'])
  })

  it('is yellow when the freshest allow-listed sign-in is older than the staleness window', () => {
    const dormantFounder = { ...founder, lastSignInAt: daysAgo(STALE_SIGN_IN_DAYS + 10) }
    const health = evaluateAllowListHealth(
      { allowedUserIds: [dormantFounder.id], allowedEmails: [] },
      [dormantFounder],
      NOW,
    )
    expect(health.status).toBe('yellow')
    expect(health.daysSinceAllowedSignIn).toBe(STALE_SIGN_IN_DAYS + 10)
  })

  it('matches emails case-insensitively like the runtime guard', () => {
    const health = evaluateAllowListHealth(
      { allowedUserIds: [], allowedEmails: ['founder@example.com'] },
      [{ ...founder, email: 'Founder@Example.COM' }],
      NOW,
    )
    expect(health.status).toBe('green')
  })
})
