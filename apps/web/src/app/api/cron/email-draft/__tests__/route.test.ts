import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks (no network) ───────────────────────────────────────────────────────

// Chainable, thenable Supabase stand-in. `.from(table)` resolves to the preset
// result for that table; `eqCalls` records every filter so we can prove the cron
// keys on action=FLAG_REVIEW.
const { supabaseState } = vi.hoisted(() => ({
  supabaseState: {
    results: {} as Record<string, { data: unknown; error: unknown }>,
    eqCalls: {} as Record<string, Array<[string, unknown]>>,
  },
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from(table: string) {
      supabaseState.eqCalls[table] ??= []
      const builder = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          supabaseState.eqCalls[table].push([col, val])
          return builder
        },
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve(
            supabaseState.results[table] ?? { data: [], error: null },
          ).then(resolve),
      }
      return builder
    },
  }),
}))

vi.mock('@/lib/integrations/google', () => ({
  getConnectedGoogleAccounts: vi.fn(),
  fetchFullThread: vi.fn(),
}))
vi.mock('@/lib/margot/account-voice', () => ({
  getAccountVoice: vi.fn(),
  getAccountAgentEnabled: vi.fn(),
}))
vi.mock('@/lib/margot/draft-reply', () => ({ generateFounderDraft: vi.fn() }))
vi.mock('@/lib/margot/providers', () => ({ createAnthropicComplete: vi.fn(() => vi.fn()) }))
const { createDraft } = vi.hoisted(() => ({ createDraft: vi.fn() }))
vi.mock('@/lib/margot/draft-store', () => ({
  createMargotDraftStore: () => ({ createDraft }),
}))

import {
  getConnectedGoogleAccounts,
  fetchFullThread,
} from '@/lib/integrations/google'
import { getAccountVoice, getAccountAgentEnabled } from '@/lib/margot/account-voice'
import { generateFounderDraft } from '@/lib/margot/draft-reply'
import { GET } from '../route'

vi.stubEnv('CRON_SECRET', 'test-secret')
vi.stubEnv('FOUNDER_USER_ID', 'founder-1')

const ACCOUNT = { email: 'dr@dr.com.au', businessKey: 'dr', label: 'DR' }

function req(auth = 'Bearer test-secret') {
  return new Request('https://app.test', { headers: { authorization: auth } })
}

function thread(id: string) {
  return {
    id,
    subject: `Subject ${id}`,
    messages: [
      {
        id: `msg-${id}`,
        from: 'sender@client.com',
        to: ACCOUNT.email,
        date: '',
        bodyHtml: null,
        bodyText: `Body of ${id}`,
        attachments: [],
        unread: true,
        labelIds: [],
      },
    ],
  }
}

const VOICE = { name: 'Phill', signOff: 'Cheers', toneGuidelines: [], neverDo: [] }

beforeEach(() => {
  vi.clearAllMocks()
  supabaseState.results = {}
  supabaseState.eqCalls = {}
  vi.mocked(getAccountVoice).mockResolvedValue(VOICE)
  vi.mocked(generateFounderDraft).mockResolvedValue('DRAFT BODY')
  vi.mocked(fetchFullThread).mockImplementation(async (_f, _e, id) => thread(id) as never)
})

describe('GET /api/cron/email-draft', () => {
  it('returns 401 when unauthorized', async () => {
    vi.stubEnv('MARGOT_DRAFTS_ENABLED', 'true')
    const res = await GET(req('bad'))
    expect(res.status).toBe(401)
  })

  it('is DORMANT when MARGOT_DRAFTS_ENABLED !== true — no accounts, no LLM, no drafts', async () => {
    vi.stubEnv('MARGOT_DRAFTS_ENABLED', '')
    const res = await GET(req())
    const body = await res.json()
    expect(body.dormant).toBe(true)
    expect(getConnectedGoogleAccounts).not.toHaveBeenCalled()
    expect(generateFounderDraft).not.toHaveBeenCalled()
    expect(createDraft).not.toHaveBeenCalled()
  })

  it('drafts nothing for an account whose agent is OFF', async () => {
    vi.stubEnv('MARGOT_DRAFTS_ENABLED', 'true')
    vi.mocked(getConnectedGoogleAccounts).mockResolvedValue([ACCOUNT] as never)
    vi.mocked(getAccountAgentEnabled).mockResolvedValue(false)
    supabaseState.results['email_triage_results'] = {
      data: [{ thread_id: 't1', subject: 'S', from_email: 'x@y.com' }],
      error: null,
    }

    const res = await GET(req())
    const body = await res.json()

    expect(generateFounderDraft).not.toHaveBeenCalled()
    expect(createDraft).not.toHaveBeenCalled()
    expect(body.totalDrafted).toBe(0)
    expect(body.accountSummaries).toContain(`${ACCOUNT.email}: agent off`)
  })

  it('with both gates ON: drafts exactly the FLAG_REVIEW threads and skips already-drafted (idempotency)', async () => {
    vi.stubEnv('MARGOT_DRAFTS_ENABLED', 'true')
    vi.mocked(getConnectedGoogleAccounts).mockResolvedValue([ACCOUNT] as never)
    vi.mocked(getAccountAgentEnabled).mockResolvedValue(true)
    // triage query (the cron filters action=FLAG_REVIEW) → three flagged threads
    supabaseState.results['email_triage_results'] = {
      data: [
        { thread_id: 't1', subject: 'S1', from_email: 'a@x.com' },
        { thread_id: 't2', subject: 'S2', from_email: 'b@x.com' },
        { thread_id: 't3', subject: 'S3', from_email: 'c@x.com' },
      ],
      error: null,
    }
    // t2 already has a draft → must be skipped
    supabaseState.results['margot_email_draft'] = {
      data: [{ thread_id: 't2' }],
      error: null,
    }

    const res = await GET(req())
    const body = await res.json()

    // keyed on FLAG_REVIEW
    expect(supabaseState.eqCalls['email_triage_results']).toContainEqual([
      'action',
      'FLAG_REVIEW',
    ])
    // drafted t1 and t3 only
    expect(createDraft).toHaveBeenCalledTimes(2)
    const draftedThreads = vi
      .mocked(createDraft)
      .mock.calls.map((c) => (c[0] as { threadId: string }).threadId)
      .sort()
    expect(draftedThreads).toEqual(['t1', 't3'])
    // every stored draft is awaiting_approval + carries the from-account
    for (const call of vi.mocked(createDraft).mock.calls) {
      const input = call[0] as { accountEmail: string; body: string }
      expect(input.accountEmail).toBe(ACCOUNT.email)
      expect(input.body).toBe('DRAFT BODY')
    }
    expect(body.totalDrafted).toBe(2)
    expect(body.totalSkipped).toBe(1)
  })

  it('respects the per-run cap (20)', async () => {
    vi.stubEnv('MARGOT_DRAFTS_ENABLED', 'true')
    vi.mocked(getConnectedGoogleAccounts).mockResolvedValue([ACCOUNT] as never)
    vi.mocked(getAccountAgentEnabled).mockResolvedValue(true)
    supabaseState.results['email_triage_results'] = {
      data: Array.from({ length: 22 }, (_, i) => ({
        thread_id: `t${i}`,
        subject: `S${i}`,
        from_email: `${i}@x.com`,
      })),
      error: null,
    }
    supabaseState.results['margot_email_draft'] = { data: [], error: null }

    const res = await GET(req())
    const body = await res.json()

    expect(createDraft).toHaveBeenCalledTimes(20)
    expect(body.totalDrafted).toBe(20)
  })

  it('NEVER imports or calls a send path', async () => {
    // Static guard: the cron source must not reach any transmit path.
    const source = readFileSync(
      join(__dirname, '..', 'route.ts'),
      'utf8',
    )
    expect(source).not.toMatch(/sendReply/)
    expect(source).not.toMatch(/sendStoredDraft/)
    expect(source).not.toMatch(/send-on-approval/)
    expect(source).not.toMatch(/markSent/)
  })
})
