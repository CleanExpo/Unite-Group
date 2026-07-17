// src/lib/cron-auth.test.ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { assertCronAuth, isCronAuthorised } from './cron-auth'

const SECRET = 'test-cron-secret'
const originalCronSecret = process.env.CRON_SECRET

function req(authHeader?: string): Request {
  return new Request('https://example.test/api/cron/anything', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = originalCronSecret
})

describe('assertCronAuth', () => {
  it('returns 500 when CRON_SECRET is unset — `Bearer undefined` must NOT pass', async () => {
    delete process.env.CRON_SECRET
    const denied = assertCronAuth(req('Bearer undefined'))
    expect(denied).not.toBeNull()
    expect(denied!.status).toBe(500)
    expect(await denied!.json()).toEqual({ error: 'CRON_SECRET not configured' })
  })

  it('returns 500 when CRON_SECRET is blank — `Bearer ` must NOT pass', async () => {
    process.env.CRON_SECRET = '   '
    const denied = assertCronAuth(req('Bearer '))
    expect(denied).not.toBeNull()
    expect(denied!.status).toBe(500)
  })

  it('returns 401 for a wrong bearer', async () => {
    process.env.CRON_SECRET = SECRET
    const denied = assertCronAuth(req('Bearer wrong'))
    expect(denied).not.toBeNull()
    expect(denied!.status).toBe(401)
    expect(await denied!.json()).toEqual({ error: 'Unauthorised' })
  })

  it('returns 401 for a missing Authorization header', async () => {
    process.env.CRON_SECRET = SECRET
    const denied = assertCronAuth(req())
    expect(denied!.status).toBe(401)
  })

  it('returns null (pass) for the correct bearer', () => {
    process.env.CRON_SECRET = SECRET
    expect(assertCronAuth(req(`Bearer ${SECRET}`))).toBeNull()
  })
})

describe('isCronAuthorised', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET
  })

  it('is false when CRON_SECRET is unset even for `Bearer undefined`', () => {
    delete process.env.CRON_SECRET
    expect(isCronAuthorised(req('Bearer undefined'))).toBe(false)
  })

  it('is false for a wrong bearer', () => {
    expect(isCronAuthorised(req('Bearer wrong'))).toBe(false)
  })

  it('is true for the correct bearer', () => {
    expect(isCronAuthorised(req(`Bearer ${SECRET}`))).toBe(true)
  })
})
