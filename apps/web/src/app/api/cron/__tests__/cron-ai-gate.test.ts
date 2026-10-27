// CRON_AI_ENABLED off-switch — founder rule 27/10/2026: "NO API KEYS".
//
// Every cron route that calls a paid model through an API key must, unless
// CRON_AI_ENABLED is exactly 'true':
//   - make no model call (wrapper or SDK),
//   - touch no database (so no write that depends on a model result),
//   - answer 200 { skipped: 'CRON_AI_ENABLED is not true' }.
// The CRON_SECRET check stays first: a bad or missing secret fails exactly as before.
// With 'true', each route must get as far as its model client.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── SDK-level guards (belt and braces under the wrapper mocks) ──────────────
const sdk = vi.hoisted(() => ({
  anthropicCreate: vi.fn(),
  geminiGenerate: vi.fn(),
}))
vi.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    messages = { create: sdk.anthropicCreate, stream: sdk.anthropicCreate }
  }
  return { default: Anthropic, Anthropic }
})
vi.mock('@google/generative-ai', () => {
  class GoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: sdk.geminiGenerate }
    }
  }
  return { GoogleGenerativeAI }
})

// ── Model clients each route imports ────────────────────────────────────────
const MODEL_STOP = 'model-mock-reached'
vi.mock('@/lib/coaches/runner', () => ({ runCoach: vi.fn() }))
vi.mock('@/lib/strategy/daily-analysis', () => ({ runDailyAnalysis: vi.fn() }))
vi.mock('@/lib/ai/router', () => ({ execute: vi.fn() }))
vi.mock('@/lib/ai/capabilities', () => ({ registerAllCapabilities: vi.fn() }))
vi.mock('@/lib/ceo-board/daily-briefing', () => ({ runDailyBriefing: vi.fn() }))
vi.mock('@/lib/content/generator', () => ({ generateContent: vi.fn() }))
vi.mock('@/lib/content/reply-generator', () => ({ generateReply: vi.fn() }))
vi.mock('@/lib/campaigns/orchestrator', () => ({ generateCampaign: vi.fn() }))

// ── Non-model dependencies ───────────────────────────────────────────────────
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/coaches/build', () => ({ fetchBuildData: vi.fn() }))
vi.mock('@/lib/coaches/life', () => ({ fetchLifeData: vi.fn() }))
vi.mock('@/lib/coaches/marketing', () => ({ fetchMarketingData: vi.fn() }))
vi.mock('@/lib/coaches/revenue', () => ({ fetchRevenueData: vi.fn() }))
vi.mock('@/lib/coaches/prompts/build', () => ({ BUILD_COACH_SYSTEM_PROMPT: 's', buildBuildUserMessage: vi.fn(() => 'm') }))
vi.mock('@/lib/coaches/prompts/life', () => ({ LIFE_COACH_SYSTEM_PROMPT: 's', buildLifeUserMessage: vi.fn(() => 'm') }))
vi.mock('@/lib/coaches/prompts/marketing', () => ({ MARKETING_COACH_SYSTEM_PROMPT: 's', buildMarketingUserMessage: vi.fn(() => 'm') }))
vi.mock('@/lib/coaches/prompts/revenue', () => ({ REVENUE_COACH_SYSTEM_PROMPT: 's', buildRevenueUserMessage: vi.fn(() => 'm') }))
vi.mock('@/lib/integrations/github-board', () => ({
  fetchOrgRepos: vi.fn().mockResolvedValue([]),
  fetchRecentCommits: vi.fn().mockResolvedValue([]),
  fetchOpenPRs: vi.fn().mockResolvedValue([]),
  isGitHubBoardConfigured: vi.fn().mockReturnValue(false),
}))
vi.mock('@/lib/integrations/linear-board', () => ({
  fetchRecentlyCompletedIssues: vi.fn().mockResolvedValue([]),
  fetchInFlightIssues: vi.fn().mockResolvedValue([]),
  fetchIssuesWithDueDates: vi.fn().mockResolvedValue([]),
}))
vi.mock('@/lib/integrations/xero', () => ({ fetchRevenueMTD: vi.fn().mockRejectedValue(new Error('no xero in test')) }))
vi.mock('@/lib/content/calendar', () => ({
  getContentGapsForWeek: vi.fn(),
  getNextScheduledSlot: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/lib/integrations/social/engagement', () => ({
  fetchNewComments: vi.fn(),
  replyToFacebookComment: vi.fn(),
  replyToInstagramComment: vi.fn(),
}))
vi.mock('@/lib/integrations/social/channels', () => ({ decodeToken: vi.fn() }))

import { createServiceClient } from '@/lib/supabase/service'
import { runCoach } from '@/lib/coaches/runner'
import { runDailyAnalysis } from '@/lib/strategy/daily-analysis'
import { execute } from '@/lib/ai/router'
import { runDailyBriefing } from '@/lib/ceo-board/daily-briefing'
import { generateContent } from '@/lib/content/generator'
import { generateReply } from '@/lib/content/reply-generator'
import { generateCampaign } from '@/lib/campaigns/orchestrator'
import { getContentGapsForWeek } from '@/lib/content/calendar'
import { fetchNewComments } from '@/lib/integrations/social/engagement'
import { CRON_AI_SKIPPED_REASON } from '@/lib/cron-ai-gate'

import { GET as campaignEngine } from '../campaign-engine/route'
import { GET as ceoBoardMeeting } from '../ceo-board-meeting/route'
import { GET as coachBuild } from '../coaches/build/route'
import { GET as coachLife } from '../coaches/life/route'
import { GET as coachMarketing } from '../coaches/marketing/route'
import { GET as coachRevenue } from '../coaches/revenue/route'
import { GET as contentEngine } from '../content-engine/route'
import { GET as engagementMonitor } from '../engagement-monitor/route'
import { GET as strategyDaily } from '../strategy-daily/route'

// ── Supabase stand-in: one row where a route needs data to reach its model ──
const TABLE_ROWS: Record<string, unknown[]> = {
  brand_identities: [{ id: 'b-1', founder_id: 'founder-1', business_key: 'dr' }],
  brand_profiles: [{ id: 'p-1', client_name: 'Client One', status: 'ready' }],
}
const CHAIN_METHODS = [
  'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'is', 'not', 'or', 'order', 'limit',
  'range', 'match', 'filter', 'insert', 'update', 'upsert', 'delete',
]
function chain(table: string) {
  const result = { data: TABLE_ROWS[table] ?? [], error: null, count: 0 }
  const b: Record<string, unknown> = {}
  for (const m of CHAIN_METHODS) b[m] = vi.fn(() => b)
  b.single = vi.fn(async () => ({ data: { id: `${table}-row` }, error: null }))
  b.maybeSingle = b.single
  b.then = (onFulfilled: (v: unknown) => unknown, onRejected: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected)
  return b
}
const from = vi.fn((table: string) => chain(table))

// ── The gated routes ─────────────────────────────────────────────────────────
type Handler = (request: Request) => Promise<Response>
interface GatedRoute {
  name: string
  handler: Handler
  query?: string
  model: () => ReturnType<typeof vi.fn>
}
const ROUTES: GatedRoute[] = [
  { name: 'campaign-engine', handler: campaignEngine, model: () => vi.mocked(generateCampaign) },
  { name: 'ceo-board-meeting', handler: ceoBoardMeeting, model: () => vi.mocked(runDailyBriefing) },
  { name: 'coaches/build', handler: coachBuild, model: () => vi.mocked(runCoach) },
  { name: 'coaches/life', handler: coachLife, model: () => vi.mocked(runCoach) },
  { name: 'coaches/marketing', handler: coachMarketing, model: () => vi.mocked(runCoach) },
  { name: 'coaches/revenue', handler: coachRevenue, model: () => vi.mocked(runCoach) },
  { name: 'content-engine', handler: contentEngine, model: () => vi.mocked(generateContent) },
  { name: 'engagement-monitor', handler: engagementMonitor, model: () => vi.mocked(generateReply) },
  { name: 'strategy-daily', handler: strategyDaily, query: '?business=ato', model: () => vi.mocked(runDailyAnalysis) },
]

const ALL_MODEL_MOCKS = () => [
  vi.mocked(runCoach), vi.mocked(runDailyAnalysis), vi.mocked(execute), vi.mocked(runDailyBriefing),
  vi.mocked(generateContent), vi.mocked(generateReply), vi.mocked(generateCampaign),
  sdk.anthropicCreate, sdk.geminiGenerate,
]

function req(route: GatedRoute, auth: string | null = 'Bearer test-secret') {
  const headers: Record<string, string> = {}
  if (auth !== null) headers.authorization = auth
  return new Request(`https://app.test/api/cron/${route.name}${route.query ?? ''}`, { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', 'test-secret')
  vi.stubEnv('FOUNDER_USER_ID', 'founder-1')
  vi.mocked(createServiceClient).mockReturnValue({ from } as never)
  for (const m of ALL_MODEL_MOCKS()) m.mockRejectedValue(new Error(MODEL_STOP))
  vi.mocked(getContentGapsForWeek).mockResolvedValue([{ platform: 'facebook', gapCount: 1 }] as never)
  vi.mocked(fetchNewComments).mockResolvedValue([
    {
      platform: 'facebook',
      externalId: 'c-1',
      postExternalId: 'post-1',
      authorName: 'Someone',
      authorId: 'a-1',
      content: 'Hello',
      createdAt: '2026-10-27T00:00:00Z',
    },
  ] as never)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const DISABLED_VALUES: Array<[string, string | undefined]> = [
  ['unset', undefined],
  ['"false"', 'false'],
  ['"TRUE"', 'TRUE'],
  ['" true "', ' true '],
]

describe.each(ROUTES)('cron AI off-switch: $name', (route) => {
  it.each(DISABLED_VALUES)('CRON_AI_ENABLED %s → 200 skipped, no model call, no DB access', async (_label, value) => {
    vi.stubEnv('CRON_AI_ENABLED', value)

    const res = await route.handler(req(route))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ skipped: CRON_AI_SKIPPED_REASON })
    for (const m of ALL_MODEL_MOCKS()) expect(m).not.toHaveBeenCalled()
    expect(createServiceClient).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('CRON_AI_ENABLED "true" → passes the gate and reaches the model client', async () => {
    vi.stubEnv('CRON_AI_ENABLED', 'true')

    const res = await route.handler(req(route))

    expect(route.model()).toHaveBeenCalled()
    expect(await res.clone().json()).not.toEqual({ skipped: CRON_AI_SKIPPED_REASON })
  })

  it.each([
    ['unset', undefined],
    ['"true"', 'true'],
  ])('bad CRON_SECRET with CRON_AI_ENABLED %s → same 401 as before, no model call', async (_label, value) => {
    vi.stubEnv('CRON_AI_ENABLED', value)

    const res = await route.handler(req(route, 'Bearer wrong-secret'))

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorised' })
    for (const m of ALL_MODEL_MOCKS()) expect(m).not.toHaveBeenCalled()
  })

  it('missing authorization header → same 401 as before', async () => {
    const res = await route.handler(req(route, null))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorised' })
  })

  it('CRON_SECRET unset → same 500 as before, checked before the AI switch', async () => {
    vi.stubEnv('CRON_SECRET', undefined)
    const res = await route.handler(req(route))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'CRON_SECRET not configured' })
  })
})
