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
// Tests marked REGRESSION fail against the pre-fix route; that was verified by
// reverting each fix and re-running. Tests marked GUARD do not discriminate
// against the pre-fix code — they pin behaviour that must not drift as this
// route changes. Labelling them honestly matters: a suite that claims every
// test is a regression test, when some cannot fail, is exactly the kind of
// vacuous green this codebase keeps getting caught by.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSingle = vi.fn()
const mockInsert = vi.fn(() => ({ select: () => ({ single: mockSingle }) }))

// Existing delivery rows for the packet, used by the ledger cap. Empty by
// default: a first delivery.
let ledgerRows: Array<{ id: string }> = []
const mockSelect = vi.fn()
function ledgerChain(result: { data: unknown; error: unknown }) {
  const chain = {
    eq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve(result),
  }
  return chain
}
const mockFrom = vi.fn(() => ({ insert: mockInsert, select: mockSelect }))

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
    ledgerRows = []
    // Re-established every test: clearAllMocks drops the implementation, and a
    // select returning undefined reads as an unreadable ledger, which now
    // (correctly) fails closed with 503.
    mockSelect.mockImplementation(() => ledgerChain({ data: ledgerRows, error: null }))
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  // ── The retryable 503 must not become a storage growth loop ───────────────

  it('collapses further deliveries once the per-packet ledger cap is reached', async () => {
    // An independent review found that a persistently failing bridge plus a
    // retryable 503 writes another full transcript row on every redelivery,
    // forever — deduplicated at the mission layer but not here.
    ledgerRows = Array.from({ length: 10 }, (_, i) => ({ id: `sess-${10 - i}` }))
    mockIngest.mockRejectedValue(new Error('still down'))

    const res = await POST(req(validPacket))
    expect(res.status).toBe(503)
    const body = (await res.json()) as { session_id: string; deliveries_collapsed: boolean }
    // No further row written...
    expect(mockInsert).not.toHaveBeenCalled()
    // ...and the caller is told plainly rather than shown a fabricated new id.
    expect(body.deliveries_collapsed).toBe(true)
    expect(body.session_id).toBe('sess-10')
  })

  it('POSITIVE CONTROL: below the cap every delivery is still recorded in full', async () => {
    ledgerRows = Array.from({ length: 9 }, (_, i) => ({ id: `sess-${9 - i}` }))
    const res = await POST(req(validPacket))
    expect(res.status).toBe(200)
    expect(mockInsert).toHaveBeenCalledTimes(1)
  })

  it('still bridges the mission when a delivery is collapsed, so a late success lands', async () => {
    ledgerRows = Array.from({ length: 10 }, (_, i) => ({ id: `sess-${10 - i}` }))
    const res = await POST(req(validPacket))
    expect(res.status).toBe(200)
    expect(mockIngest).toHaveBeenCalledTimes(1)
    const body = (await res.json()) as {
      mission: { status: string }
      deliveries_collapsed: boolean
      session_id: string
    }
    expect(body.mission.status).toBe('created')
    // Without these the test passes against the pre-cap code, which also bridges
    // and also returns 200 — it just writes another transcript row first.
    expect(mockInsert).not.toHaveBeenCalled()
    expect(body.deliveries_collapsed).toBe(true)
    expect(body.session_id).toBe('sess-10')
  })

  it('REGRESSION: treats a null ledger body as unreadable, not as empty', async () => {
    // `{ data: null, error: null }` was coerced to [] by `?? []`, reported
    // under_cap, and inserted another transcript on every redelivery — the same
    // fail-open the error path already closed, reached through a different door.
    mockSelect.mockImplementationOnce(() => ledgerChain({ data: null, error: null }))
    const res = await POST(req(validPacket))
    expect(res.status).toBe(503)
    expect(((await res.json()) as { error: string }).error).toBe('delivery_ledger_unavailable')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('REGRESSION: treats a non-array ledger body as unreadable', async () => {
    mockSelect.mockImplementationOnce(() => ledgerChain({ data: { oops: true }, error: null }))
    const res = await POST(req(validPacket))
    expect(res.status).toBe(503)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('REGRESSION: fails CLOSED with 503 when the delivery ledger cannot be read', async () => {
    // Treating an unreadable ledger as "under the cap" reproduced the unbounded
    // growth the cap exists to prevent, at the moment the database is already
    // unhealthy. Nothing is written and the caller is asked to redeliver.
    mockSelect.mockImplementationOnce(() => ledgerChain({ data: null, error: { message: 'db down' } }))
    const res = await POST(req(validPacket))
    expect(res.status).toBe(503)
    expect(((await res.json()) as { error: string }).error).toBe('delivery_ledger_unavailable')
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockIngest).not.toHaveBeenCalled()
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

  it('GUARD: a legal summary reaches both summary and requested_outcome intact', async () => {
    // Deliberately NOT claimed as a regression test. Codex was right that a
    // 500-character summary is unchanged by the old `.slice(0, 500)`, and now
    // that anything longer is refused outright there is no legal input where the
    // old and new code differ. The discriminating test for that fix is the
    // 501-character refusal above; this one only pins the fallback wiring.
    const summary = 's'.repeat(500)
    await POST(req({ ...validPacket, summary }))
    const inserted = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(inserted.summary).toBe(summary)
    expect(inserted.requested_outcome).toBe(summary)
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

  it('bounds evidence_refs KEYS, not just values and count', async () => {
    // An independent review found this: bounding the entry count and the values
    // while leaving keys unbounded still admits one entry with a 100 KB key.
    const res = await POST(req({ ...validPacket, evidence_refs: { ['k'.repeat(201)]: 'v' } }))
    expect(res.status).toBe(413)
    expect(((await res.json()) as { field: string }).field).toBe('evidence_refs')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('accepts a legal evidence_refs key, so the bound is not a blanket refusal', async () => {
    const res = await POST(req({ ...validPacket, evidence_refs: { ['k'.repeat(200)]: 'v' } }))
    expect(res.status).toBe(200)
  })

  it('GUARD: reports a malformed packet as malformed, not as oversized', async () => {
    // Pre-fix this route already returned 400 here, so it cannot fail against
    // the old code. It guards the NEW 413 path from swallowing malformed
    // packets as it evolves.
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

  it('REGRESSION: answers 503 when the provenance key is unset, so the sender retries', async () => {
    // provenance_secret_unset is a SERVER misconfiguration, not a verdict about
    // the packet. Returning 200 told ElevenLabs the delivery succeeded, so a
    // deployment missing MISSION_PROVENANCE_SECRET silently dropped every
    // mission the founder spoke — transcripts arriving, no missions appearing,
    // and no retry.
    mockIngest.mockResolvedValue({ status: 'rejected', reasons: ['provenance_secret_unset'] })
    const res = await POST(req(validPacket))
    expect(res.status).toBe(503)
    const body = (await res.json()) as { ok: boolean; mission: { reason: string } }
    expect(body.ok).toBe(false)
    expect(body.mission.reason).toBe('provenance_secret_unset')
  })

  it('REGRESSION: the AT-CAP path also answers 503 on a missing provenance key', async () => {
    // The route has two exit paths and each carried its own copy of the
    // mission-to-HTTP mapping. When provenance_secret_unset was made retryable,
    // only the ordinary path was updated, so an at-cap delivery hitting a
    // missing key still answered 200 with ok: true and the sender stopped
    // retrying. Both paths now call one shared decider.
    ledgerRows = Array.from({ length: 10 }, (_, i) => ({ id: `sess-${10 - i}` }))
    mockIngest.mockResolvedValue({ status: 'rejected', reasons: ['provenance_secret_unset'] })
    const res = await POST(req(validPacket))
    expect(res.status).toBe(503)
    const body = (await res.json()) as { ok: boolean; deliveries_collapsed: boolean }
    expect(body.ok).toBe(false)
    expect(body.deliveries_collapsed).toBe(true)
  })

  it('REGRESSION: the AT-CAP path keeps 409 for a conflict AND collapses the delivery', async () => {
    // The earlier version of this test only asserted the 409, which the
    // ordinary path already produced — so it passed without ever exercising the
    // at-cap branch and an independent review correctly called it decorative.
    // Asserting the collapse is what pins it to this branch.
    ledgerRows = Array.from({ length: 10 }, (_, i) => ({ id: `sess-${10 - i}` }))
    mockIngest.mockResolvedValue({
      status: 'conflict', task: { id: 'task-1', status: 'awaiting_approval' }, reason: 'payload_changed',
    })
    const res = await POST(req(validPacket))
    expect(res.status).toBe(409)
    const body = (await res.json()) as { deliveries_collapsed: boolean; session_id: string }
    expect(body.deliveries_collapsed).toBe(true)
    expect(body.session_id).toBe('sess-10')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('REGRESSION: an unwritten audit receipt is retryable, not a silent 200', async () => {
    // created_incomplete means the mission exists but its immutable `created`
    // event does not. Returning 200 told the sender the delivery was complete,
    // so nothing retried and the audit hole became permanent.
    mockIngest.mockResolvedValue({
      status: 'created_incomplete',
      task: { id: 'task-1', status: 'awaiting_approval' },
      admission: { tier: 'L1', reason: 'ok' },
      receipt: 'incomplete',
    })
    const res = await POST(req(validPacket))
    expect(res.status).toBe(503)
    const body = (await res.json()) as { ok: boolean; mission: { receipt: string } }
    expect(body.ok).toBe(false)
    expect(body.mission.receipt).toBe('incomplete')
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
