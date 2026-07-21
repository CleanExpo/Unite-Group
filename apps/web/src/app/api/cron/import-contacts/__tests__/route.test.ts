import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { parseFrom, GET } from '../route'

describe('parseFrom', () => {
  it('parses "Name <email>" form', () => {
    expect(parseFrom('Jane Doe <jane@acme.com>')).toEqual({ name: 'Jane Doe', email: 'jane@acme.com' })
  })

  it('parses quoted-name form and lowercases the email', () => {
    expect(parseFrom('"Doe, Jane" <Jane@ACME.com>')).toEqual({ name: 'Doe, Jane', email: 'jane@acme.com' })
  })

  it('parses a bare email with no name', () => {
    expect(parseFrom('bob@acme.com')).toEqual({ name: null, email: 'bob@acme.com' })
  })

  it('returns null email for a non-email string (never a fake contact)', () => {
    expect(parseFrom('Mailer Daemon')).toEqual({ name: null, email: null })
  })

  it('returns null email when angle-bracket content is not an email', () => {
    expect(parseFrom('No Reply <not-an-email>')).toEqual({ name: 'No Reply', email: null })
  })
})

describe('GET auth', () => {
  it('rejects an unauthenticated request with 401 (no DB access)', async () => {
    vi.stubEnv('CRON_SECRET', 'test-secret')
    const req = new NextRequest('https://x.test/api/cron/import-contacts')
    const res = await GET(req)
    expect(res.status).toBe(401)
    vi.unstubAllEnvs()
  })

  it('rejects `Bearer undefined` with 500 when CRON_SECRET is unset (no bypass)', async () => {
    vi.stubEnv('CRON_SECRET', undefined)
    const req = new NextRequest('https://x.test/api/cron/import-contacts', {
      headers: { authorization: 'Bearer undefined' },
    })
    const res = await GET(req)
    expect(res.status).toBe(500)
    vi.unstubAllEnvs()
  })
})
