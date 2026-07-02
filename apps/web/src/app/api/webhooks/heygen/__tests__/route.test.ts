import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { POST } from '../route'

const SECRET = 'test-heygen-webhook-secret'

let mockJobResult: any = { data: null }
let mockUpdateResult: any = { error: null }

function makeSelectChain() {
  const b: Record<string, any> = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  }
  b.select.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  b.single.mockResolvedValue(mockJobResult)
  return b
}

function makeUpdateChain() {
  const b: Record<string, any> = {
    update: vi.fn(),
    eq: vi.fn(),
    then: (r: any) => Promise.resolve(mockUpdateResult).then(r),
  }
  b.update.mockReturnValue(b)
  b.eq.mockReturnValue(b)
  return b
}

function sign(body: string): string {
  return createHmac('sha256', SECRET).update(body).digest('hex')
}

function req(body: object, opts: { signed?: boolean } = { signed: true }) {
  const raw = JSON.stringify(body)
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.signed) headers['x-heygen-signature'] = sign(raw)
  return new NextRequest('https://app.test/api/webhooks/heygen', {
    method: 'POST',
    headers,
    body: raw,
  })
}

describe('POST /api/webhooks/heygen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.HEYGEN_WEBHOOK_SECRET = SECRET
    const mockFrom = vi.fn()
    mockFrom.mockReturnValueOnce(makeSelectChain()).mockReturnValueOnce(makeUpdateChain())
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
  })

  it('returns 401 when the signature header is missing (UNI-2224)', async () => {
    const res = await POST(req({ video_id: 'vid-1', status: 'completed' }, { signed: false }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when the signature does not match (UNI-2224)', async () => {
    const raw = JSON.stringify({ video_id: 'vid-1', status: 'completed', url: 'https://evil.example.com/vid.mp4' })
    const res = await POST(
      new NextRequest('https://app.test/api/webhooks/heygen', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-heygen-signature': 'deadbeef'.repeat(8) },
        body: raw,
      })
    )
    expect(res.status).toBe(401)
  })

  it('returns 400 when video_id missing', async () => {
    const res = await POST(req({ status: 'completed' }))
    expect(res.status).toBe(400)
  })

  it('returns 200 with matched:false when no job found', async () => {
    mockJobResult = { data: null }
    const res = await POST(req({ video_id: 'vid-1', status: 'completed', url: 'https://cdn.example.com/vid.mp4' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
    expect(body.matched).toBe(false)
  })

  it('advances a completed job to queued with the HeyGen URL as the deliverable (UNI-2219)', async () => {
    // No server-side compositing exists; the job must NOT be parked forever in
    // a fake 'composing'. The HeyGen render is the deliverable → queued.
    mockJobResult = { data: { id: 'job-1', founder_id: 'user-1', status: 'video_pending' } }
    mockUpdateResult = { error: null }
    const updateChain = makeUpdateChain()
    const mockFrom = vi.fn()
    mockFrom.mockReturnValueOnce(makeSelectChain()).mockReturnValueOnce(updateChain)
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
    const res = await POST(req({ video_id: 'vid-1', status: 'completed', url: 'https://cdn.example.com/vid.mp4' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.next).toBe('queued')
    const updateArg = updateChain.update.mock.calls[0][0]
    expect(updateArg.status).toBe('queued')
    expect(updateArg.final_video_url).toBe('https://cdn.example.com/vid.mp4')
  })

  it('returns 200 with status:failed when HeyGen reports failure', async () => {
    mockJobResult = { data: { id: 'job-1', founder_id: 'user-1', status: 'video_pending' } }
    mockUpdateResult = { error: null }
    const mockFrom = vi.fn()
    mockFrom.mockReturnValueOnce(makeSelectChain()).mockReturnValueOnce(makeUpdateChain())
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
    const res = await POST(req({ video_id: 'vid-1', status: 'failed', error: 'render failed' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('failed')
  })

  it('returns 200 with status:processing for in-progress payload', async () => {
    mockJobResult = { data: { id: 'job-1', founder_id: 'user-1', status: 'video_pending' } }
    const mockFrom = vi.fn()
    mockFrom.mockReturnValueOnce(makeSelectChain())
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any)
    const res = await POST(req({ video_id: 'vid-1', status: 'processing' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('processing')
  })
})
