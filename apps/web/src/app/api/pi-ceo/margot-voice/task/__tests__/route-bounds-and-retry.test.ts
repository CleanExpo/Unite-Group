// Regression coverage for two P1s an independent review found on c8e35bc6:
//
//   (3) "The raw, unbounded transcript is persisted before strict validation."
//       Only `summary` was bounded, and by a silent .slice(0, 500). An
//       authenticated caller could park an arbitrarily large blob in
//       margot_voice_sessions, which margot-health and the os-health-rollup cron
//       both read back.
//
//   (4) "A bridge failure returns HTTP 200, so callers never retry."
//       ElevenLabs recorded a successful delivery for a mission that never
//       reached cc_tasks. The founder had spoken a mission that existed only as
//       a transcript and nothing on either side would notice.
//
// Each test below fails against the pre-fix route.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSingle = vi.fn()
const mockInsert = vi.fn(() => ({ select: () => ({ single: mockSingle }) }))
const mockFrom = vi.fn(() => ({ insert: mockInsert }))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}))

// The bridge is stubbed so each test controls exactly one variable: whether the
// voice → cc_tasks hop succeeded, failed, was refused on its merits, or hit a
// reused packet id.
const mockIngest = vi.fn()
vi.mock('@/lib/command-centre/voice-mission-bridge', () => ({
  ingestVoiceMission: (...args: unknown[]) => mockIngest(...args),
}))

import { POST } from '../route'

const ORIGINAL_ENV = { ...process.env }
const TOKEN = 'ingest-token-123'
const FOUNDER = 'founder-uuid'

function req(body: unknown) {
  return new Request('https://app.test/api/pi-ceo/margot-voice/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  }) as never
}

const validPacket = {
  packet_id: 'pkt-1',
  summary: 'Founder wants a campaign brief',
  transcript_text: 'Hello Margot, please draft a campaign brief.',
  conversation_id: 'conv-1',
  risk_level: 'low',
}

function created() {
  return {
    status: 'created' as const,
    task: { id: 'task-1', status: 'awaiting_approval' },
    admission: { tier: 'L1', reason: 'ok' },
    receipt: 'complete' as const,
  }
}

describe('margot-voice ingest: payload bounds and retry semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ELEVENLABS_INGEST_TOKEN = TOKEN
    process.env.FOUNDER_USER_ID = FOUNDER
    mockSingle.mockResolvedValue({ data: { id: 'sess-1' }, error: null })
    mockIngest.mockResolvedValue(created())
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  // ── P1 #3: nothing unbounded is ever persisted ────────────────────────────

  it('POSITIVE CONTROL: an ordinary packet is still accepted and persisted', async () => {
    const res = await POST(req(validPacket))
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('refuses an oversized transcript with 413 and never touches the database', async () => {
    const res = await POST(req({ ...validPacket, transcript_text: 'x'.repeat(50_001) }))
    expect(res.status).toBe(413)
    const body = (await res.json()) as { error: string; field: string }
    expect(body.error).toBe('packet_too_large')
    expect(body.field).toBe('transcript_text')
    // The point of the fix: the blob does not reach storage.
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('accepts a long-but-legal transcript, so the bound is not merely a blanket refusal', async () => {
    const res = await POST(req({ ...validPacket, transcript_text: 'x'.repeat(49_999) }))
    expect(res.status).toBe(200)
    const inserted = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect((inserted.transcript_text as string).length).toBe(49_999)
  })

  it('refuses an over-long summary instead of silently truncating it to 500', async () => {
    const res = await POST(req({ ...validPacket, summary: 's'.repeat(501) }))
    expect(res.status).toBe(413)
    expect(((await res.json()) as { field: string }).field).toBe('summary')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('stores a legal summary whole, with no slice applied', async () => {
    const summary = 's'.repeat(500)
    await POST(req({ ...validPacket, summary }))
    const inserted = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(inserted.summary).toBe(summary)
  })

  it('bounds the actions array by count and by serialised size', async () => {
    const byCount = await POST(
      req({ ...validPacket, actions: Array.from({ length: 51 }, () => ({ kind: 'research' })) }),
    )
    expect(byCount.status).toBe(413)
    expect(((await byCount.json()) as { field: string }).field).toBe('actions')

    vi.clearAllMocks()
    mockSingle.mockResolvedValue({ data: { id: 'sess-1' }, error: null })
    mockIngest.mockResolvedValue(created())
    const bySize = await POST(req({ ...validPacket, actions: [{ kind: 'x'.repeat(20_001) }] }))
    expect(bySize.status).toBe(413)
    expect(((await bySize.json()) as { field: string }).field).toBe('actions')
  })

  it('bounds evidence_refs by entry count and value length', async () => {
    const many = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, 'v']))
    const byCount = await POST(req({ ...validPacket, evidence_refs: many }))
    expect(byCount.status).toBe(413)

    vi.clearAllMocks()
    mockSingle.mockResolvedValue({ data: { id: 'sess-1' }, error: null })
    mockIngest.mockResolvedValue(created())
    const byValue = await POST(req({ ...validPacket, evidence_refs: { k: 'v'.repeat(2_001) } }))
    expect(byValue.status).toBe(413)
    expect(((await byValue.json()) as { field: string }).field).toBe('evidence_refs')
  })

  it('reports a malformed packet as malformed, not as oversized', async () => {
    // Missing transcript AND an over-long summary: shape wins, so the caller is
    // told the actionable thing first.
    const res = await POST(req({ packet_id: 'pkt-1', summary: 's'.repeat(9_000) }))
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toBe('invalid_packet')
  })

  // ── P1 #4: the HTTP status is an honest retry instruction ─────────────────

  it('answers 503 when the mission bridge throws, so the caller redelivers', async () => {
    mockIngest.mockRejectedValue(new Error('supabase unreachable'))
    const res = await POST(req(validPacket))
    expect(res.status).toBe(503)
    const body = (await res.json()) as { ok: boolean; mission: { status: string } }
    expect(body.ok).toBe(false)
    expect(body.mission.status).toBe('bridge_failed')
    // The transcript still persisted — the session is the durable account of
    // what was said even when the mission did not land.
    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(body).toHaveProperty('session_id', 'sess-1')
  })

  it('answers 200 for a mission refused on its merits, which retrying cannot fix', async () => {
    mockIngest.mockResolvedValue({ status: 'rejected', reasons: ['unsafe_action'] })
    const res = await POST(req(validPacket))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; mission: { status: string; reason: string } }
    expect(body.ok).toBe(true)
    expect(body.mission.status).toBe('rejected')
    expect(body.mission.reason).toBe('unsafe_action')
  })

  it('still answers 409 for a reused packet id with a changed payload', async () => {
    mockIngest.mockResolvedValue({
      status: 'conflict',
      task: { id: 'task-1', status: 'awaiting_approval' },
      reason: 'payload_changed',
    })
    const res = await POST(req(validPacket))
    expect(res.status).toBe(409)
    expect(((await res.json()) as { ok: boolean }).ok).toBe(false)
  })

  it('does not leak the transcript into the failure response', async () => {
    mockIngest.mockRejectedValue(new Error(`boom: ${validPacket.transcript_text}`))
    const res = await POST(req(validPacket))
    expect(res.status).toBe(503)
    expect(await res.text()).not.toContain('campaign brief')
  })
})
