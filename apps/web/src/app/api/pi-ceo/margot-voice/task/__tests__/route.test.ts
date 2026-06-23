// Regression coverage — POST /api/pi-ceo/margot-voice/task
// Ingest endpoint for the ElevenLabs voice agent. Auth is a bearer token
// (ELEVENLABS_INGEST_TOKEN), not a session. Supabase service client is mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSingle = vi.fn()
const mockInsert = vi.fn(() => ({ select: () => ({ single: mockSingle }) }))
const mockFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}))

import { POST } from '../route'

const ORIGINAL_ENV = { ...process.env }
const TOKEN = 'ingest-token-123'
const FOUNDER = 'founder-uuid'

function req(body: unknown, opts: { token?: string | null; raw?: string } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (opts.token !== null) headers.authorization = `Bearer ${opts.token ?? TOKEN}`
  return new Request('https://app.test/api/pi-ceo/margot-voice/task', {
    method: 'POST',
    headers,
    body: opts.raw ?? JSON.stringify(body),
  }) as never
}

const validPacket = {
  packet_id: 'pkt-1',
  summary: 'Founder wants a campaign brief',
  transcript_text: 'Hello Margot, please draft a campaign brief.',
  conversation_id: 'conv-1',
  risk_level: 'low',
}

describe('POST /api/pi-ceo/margot-voice/task', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ELEVENLABS_INGEST_TOKEN = TOKEN
    process.env.FOUNDER_USER_ID = FOUNDER
    mockSingle.mockResolvedValue({ data: { id: 'sess-1' }, error: null })
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('401 when the bearer token is missing', async () => {
    const res = await POST(req(validPacket, { token: null }))
    expect(res.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('401 when the bearer token is wrong', async () => {
    const res = await POST(req(validPacket, { token: 'nope' }))
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('unauthorized')
  })

  it('503 when FOUNDER_USER_ID is not configured', async () => {
    delete process.env.FOUNDER_USER_ID
    const res = await POST(req(validPacket))
    expect(res.status).toBe(503)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('400 when the JSON body is malformed', async () => {
    const res = await POST(req(null, { raw: '{not json' }))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('invalid_json')
  })

  it('400 invalid_packet when required fields are missing', async () => {
    const res = await POST(req({ packet_id: 'pkt-1' })) // no summary/transcript
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('invalid_packet')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('200 inserts a founder-scoped session on success', async () => {
    const res = await POST(req(validPacket))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: boolean
      session_id: string
      risk_level: string
      approval_required: boolean
    }
    expect(body.ok).toBe(true)
    expect(body.session_id).toBe('sess-1')
    expect(body.risk_level).toBe('low')
    expect(body.approval_required).toBe(false)

    expect(mockFrom).toHaveBeenCalledWith('margot_voice_sessions')
    const inserted = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(inserted.founder_id).toBe(FOUNDER)
    expect(inserted.packet_id).toBe('pkt-1')
  })

  it('forces approval_required when risk_level is high', async () => {
    const res = await POST(req({ ...validPacket, risk_level: 'high', approval_required: false }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { approval_required: boolean; risk_level: string }
    expect(body.risk_level).toBe('high')
    expect(body.approval_required).toBe(true)
    const inserted = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(inserted.approval_required).toBe(true)
  })

  it('500 when the session insert fails', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    const res = await POST(req(validPacket))
    expect(res.status).toBe(500)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('voice_session_insert_failed')
  })
})
