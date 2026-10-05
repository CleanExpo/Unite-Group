import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- agent_actions stand-in: enforces the PRIMARY KEY on id like prod -------
let rows: Array<Record<string, any>>
const insert = vi.fn(async (row: Record<string, any>) => {
  if (rows.some((r) => r.id === row.id)) {
    return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
  }
  rows.push(row)
  return { data: null, error: null }
})
const from = vi.fn(() => ({ insert }))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({ from })),
}))
vi.mock('@/lib/ai/client', () => ({
  getAIClient: vi.fn(),
}))
vi.mock('@/lib/site-agent/site-keys', () => ({
  validateSiteKey: vi.fn(),
}))
vi.mock('@/lib/site-agent/grounding', () => ({
  ground: vi.fn(async () => ({ snippets: [], source: 'none', businessName: 'Synthex' })),
  formatGroundingContext: vi.fn(() => ''),
}))
vi.mock('@/lib/site-agent/quota', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/site-agent/quota')>()
  return { ...actual, claimPublicAgentQuota: vi.fn() }
})
vi.mock('@/lib/ai/usage-recorder', () => ({
  recordAiUsage: vi.fn(async () => undefined),
}))
vi.mock('@/lib/crm/activity-timeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/crm/activity-timeline')>()
  return { ...actual, buildCrmActivityTimelineEvent: vi.fn(actual.buildCrmActivityTimelineEvent) }
})

import { getAIClient } from '@/lib/ai/client'
import { validateSiteKey } from '@/lib/site-agent/site-keys'
import { claimPublicAgentQuota } from '@/lib/site-agent/quota'
import { buildCrmActivityTimelineEvent } from '@/lib/crm/activity-timeline'
import { POST } from '../route'

const CONVERSATION_ID = 'conv_abcdefghijklmnop'

let keyCounter = 0
function uniqueKey() {
  keyCounter += 1
  return `sk_site_transcript_${keyCounter}`
}

function req(body: object) {
  return new Request('https://app.test/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://client.example' },
    body: JSON.stringify(body),
  })
}

function anthropicEvents(...texts: string[]) {
  return (async function* () {
    yield { type: 'message_start' }
    for (const text of texts) {
      yield { type: 'content_block_delta', delta: { type: 'text_delta', text } }
    }
    yield { type: 'message_stop' }
  })()
}

function chat(extra: object = {}) {
  return req({
    siteKey: uniqueKey(),
    conversationId: CONVERSATION_ID,
    messages: [{ role: 'user', content: 'What do you offer?' }],
    ...extra,
  })
}

describe('POST /api/agent — site-chat transcripts (UNI-2920)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rows = []
    vi.stubEnv('SITE_AGENT_TRANSCRIPTS_ENABLED', 'true')
    vi.mocked(validateSiteKey).mockResolvedValue({
      ok: true,
      founderId: 'founder-1',
      businessKey: 'synthex',
    })
    vi.mocked(claimPublicAgentQuota).mockResolvedValue({ ok: true })
    vi.mocked(getAIClient).mockImplementation(
      () => ({ messages: { create: vi.fn(async () => anthropicEvents('We ', 'build websites.')) } }) as any,
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('flag off: never calls the builder or the database, stream unchanged', async () => {
    vi.stubEnv('SITE_AGENT_TRANSCRIPTS_ENABLED', 'TRUE') // only exactly 'true' is on
    const body = await (await POST(chat())).text()
    expect(body).toContain('data: {"delta":"build websites."}')
    expect(body.trimEnd().endsWith('data: [DONE]')).toBe(true)
    expect(buildCrmActivityTimelineEvent).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
  })

  it('flag on: records the completed exchange once, scoped from the site key not the body', async () => {
    const body = await (
      await POST(chat({ businessKey: 'evil-co', founderId: 'founder-evil', business_key: 'evil-co' }))
    ).text()
    expect(body.trimEnd().endsWith('data: [DONE]')).toBe(true)

    expect(insert).toHaveBeenCalledTimes(1)
    expect(from).toHaveBeenCalledWith('agent_actions')
    const row = insert.mock.calls[0][0]
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(row).toMatchObject({
      source: 'margot',
      action_type: 'crm_timeline_site_chat_exchange',
      status: 'done',
      parent_id: null,
      payload: {
        category: 'conversation',
        subjectId: CONVERSATION_ID,
        businessSlug: 'synthex',
        source: 'api/agent',
        metadata: {
          conversationId: CONVERSATION_ID,
          visitorMessage: 'What do you offer?',
          assistantReply: 'We build websites.',
          visitorMessageRedacted: false,
          assistantReplyRedacted: false,
        },
      },
    })
    expect(JSON.stringify(row)).not.toContain('evil')
  })

  it('builder throws: visitor still gets the full stream and [DONE], no error event', async () => {
    vi.mocked(buildCrmActivityTimelineEvent).mockImplementationOnce(() => {
      throw new Error('builder exploded')
    })
    const body = await (await POST(chat())).text()
    expect(body).toContain('data: {"delta":"We "}')
    expect(body).toContain('data: {"delta":"build websites."}')
    expect(body).not.toContain('stream_failed')
    expect(body.trimEnd().endsWith('data: [DONE]')).toBe(true)
    expect(buildCrmActivityTimelineEvent).toHaveBeenCalledTimes(1)
    expect(insert).not.toHaveBeenCalled()
  })

  it('invalid or missing conversationId: answers normally, writes nothing', async () => {
    for (const conversationId of ['short', 'has spaces in it here!!', 'x'.repeat(65), 12345678901234567, undefined]) {
      const res = await POST(chat({ conversationId }))
      expect(res.status).toBe(200)
      const body = await res.text()
      expect(body).toContain('data: {"delta":"build websites."}')
      expect(body.trimEnd().endsWith('data: [DONE]')).toBe(true)
    }
    expect(insert).not.toHaveBeenCalled()
  })

  it('duplicate client retry of the same request: exactly one row, both streams complete', async () => {
    const first = await (await POST(chat())).text()
    const retry = await (await POST(chat())).text()
    expect(first.trimEnd().endsWith('data: [DONE]')).toBe(true)
    expect(retry.trimEnd().endsWith('data: [DONE]')).toBe(true)
    expect(retry).not.toContain('stream_failed')
    expect(insert).toHaveBeenCalledTimes(2)
    expect(insert.mock.calls[0][0].id).toBe(insert.mock.calls[1][0].id)
    expect(rows).toHaveLength(1)

    // A genuinely new turn in the same conversation is a new row.
    await (
      await POST(
        chat({
          messages: [
            { role: 'user', content: 'What do you offer?' },
            { role: 'assistant', content: 'We build websites.' },
            { role: 'user', content: 'How much?' },
          ],
        }),
      )
    ).text()
    expect(rows).toHaveLength(2)
  })
})
