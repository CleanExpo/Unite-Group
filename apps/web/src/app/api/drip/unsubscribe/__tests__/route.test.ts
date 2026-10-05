import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// --- Supabase service mock: capture upserts ------------------------------
let upserts: Array<{ table: string; payload: any; options: any }>
let upsertResult: { error: { message: string } | null }

const mockFrom = vi.fn((table: string) => ({
  upsert: vi.fn((payload: any, options: any) => {
    upserts.push({ table, payload, options })
    return Promise.resolve(upsertResult)
  }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}))

import { GET, POST } from '../route'
import { unsubscribeUrlBuilder } from '@/lib/campaigns/drip-unsubscribe'

function validUrl(email = 'Lead@Example.com') {
  const build = unsubscribeUrlBuilder('founder-1')
  if (!build) throw new Error('builder unavailable — env stubs missing')
  return build(email)
}

function tamper(url: string): string {
  const u = new URL(url)
  const token = u.searchParams.get('token') ?? ''
  const [data, sig] = token.split('.')
  // Re-point the payload at another address but keep the old signature.
  const forged = Buffer.from(JSON.stringify({ f: 'founder-1', e: 'victim@example.com' })).toString(
    'base64url'
  )
  u.searchParams.set('token', `${forged}.${sig}`)
  expect(data).not.toBe(forged)
  return u.toString()
}

function oneClick(url: string) {
  return new NextRequest(url, {
    method: 'POST',
    body: 'List-Unsubscribe=One-Click',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

describe('/api/drip/unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.test')
    vi.stubEnv('DRIP_UNSUBSCRIBE_SECRET', 'test-unsubscribe-secret')
    upserts = []
    upsertResult = { error: null }
  })

  it('refuses a tampered token on GET and POST and writes nothing', async () => {
    const forged = tamper(validUrl())

    const getRes = await GET(new NextRequest(forged))
    const postRes = await POST(oneClick(forged))

    expect(getRes.status).toBe(400)
    expect(postRes.status).toBe(400)
    expect(upserts).toEqual([])
  })

  it('refuses a token signed with a different secret', async () => {
    const url = validUrl()
    vi.stubEnv('DRIP_UNSUBSCRIBE_SECRET', 'rotated-secret')

    const res = await POST(oneClick(url))

    expect(res.status).toBe(400)
    expect(upserts).toEqual([])
  })

  it('GET with a valid token shows a confirmation form and does NOT write (prefetch-safe)', async () => {
    const res = await GET(new NextRequest(validUrl()))
    const html = await res.text()

    expect(res.status).toBe(200)
    expect(html).toContain('<form method="post"')
    expect(html).toContain('lead@example.com')
    expect(upserts).toEqual([])
  })

  it('one-click POST with a valid token writes one idempotent suppression row', async () => {
    const res = await POST(oneClick(validUrl()))

    expect(res.status).toBe(200)
    expect(upserts).toHaveLength(1)
    expect(upserts[0]).toEqual({
      table: 'drip_suppressions',
      payload: {
        founder_id: 'founder-1',
        email: 'lead@example.com',
        reason: 'unsubscribed',
        source: 'list_unsubscribe_one_click',
      },
      options: { onConflict: 'founder_id,email', ignoreDuplicates: true },
    })
  })

  it('a repeated unsubscribe is a no-op upsert on the same key, still 200', async () => {
    await POST(oneClick(validUrl()))
    const again = await POST(oneClick(validUrl('LEAD@example.com ')))

    expect(again.status).toBe(200)
    expect(upserts).toHaveLength(2)
    expect(upserts[1].payload).toEqual(upserts[0].payload)
    expect(upserts[1].options).toEqual({ onConflict: 'founder_id,email', ignoreDuplicates: true })
  })

  it('reports an honest 500 when the suppression write fails', async () => {
    upsertResult = { error: { message: 'relation "drip_suppressions" does not exist' } }

    const res = await POST(oneClick(validUrl()))

    expect(res.status).toBe(500)
    expect(await res.text()).toContain('not recorded')
  })
})
