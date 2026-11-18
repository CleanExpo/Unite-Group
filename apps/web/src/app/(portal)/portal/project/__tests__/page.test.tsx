import { prerender } from 'react-dom/static.edge'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({ captureClientError: vi.fn() }))
vi.mock('@/lib/portal/projects/server', () => ({ portalProjectsContext: vi.fn() }))
vi.mock('../actions', () => ({ submitProjectRequestAction: vi.fn(), respondToItemAction: vi.fn() }))

import { renderedFindings } from '@/__tests__/portal-forbidden-words'
import type { PortalAccess } from '@/lib/portal/changes/access'
import { portalProjectsContext } from '@/lib/portal/projects/server'
import type { PortalProjectsDb } from '@/lib/portal/projects/service'

import ProjectPage from '../page'

const OWNER = { userId: 'u1', ownerId: 'u1', tenantSlug: 'ccw-demo', plan: 'comp', aal: 'aal2' } as const
const NOW = Date.now()
const iso = (daysAgo: number) => new Date(NOW - daysAgo * 86400000).toISOString()

function db(projects: unknown[] | null, items: unknown[] | null): PortalProjectsDb {
  return {
    rpc: vi.fn(),
    from(table) {
      return {
        select: () => ({
          eq: () => ({
            order: async () => {
              const data = table === 'portal_projects' ? projects : items
              return data ? { data, error: null } : { data: null, error: { message: 'boom' } }
            },
          }),
        }),
      }
    },
  }
}

const PROJECT = {
  id: 'p1', tenant_slug: 'ccw-demo', slug: 'optix', name: 'Optix ERP (synthetic)', objective: 'Run stock and sales in one place.',
  health: 'on_hold', health_reason: null, production_hold: true, hold_reason: 'Owner production hold.', current_milestone: 'Phase 2 reconciliation',
  updated_at: iso(1),
}
const base = {
  project_id: 'p1', tenant_slug: 'ccw-demo', kind: 'requirement', client_text: 'x', plain_summary: null, summary_is_ai_proposal: false,
  waiting_on: 'unite', source: 'portal', author_kind: 'client_human', cc_task_id: 't', evidence: [{ label: 'vitest' }],
  blocker_reason: null, decision_needed: null, client_note: null, forecast_window: null, forecast_confidence: null,
  forecast_basis: null, forecast_updated_at: null, created_at: iso(10), updated_at: iso(1),
}
const ITEMS = [
  { ...base, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', title: 'Portal block review', state: 'awaiting_client_review', waiting_on: 'client' },
  { ...base, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', title: 'Area 2 valuation', state: 'blocked', evidence: [], blocker_reason: 'Approved read-only data source not agreed' },
  { ...base, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', title: 'Stock by branch', state: 'client_accepted' },
  { ...base, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', title: 'Bot idea', state: 'proposed', source: 'telegram', author_kind: 'client_bot', evidence: [], summary_is_ai_proposal: true, plain_summary: 'Add a stock alert' },
]

async function render(access: PortalAccess, d: PortalProjectsDb): Promise<string> {
  vi.mocked(portalProjectsContext).mockResolvedValue({ access, db: d })
  const { prelude } = await prerender(<>{await ProjectPage()}</>)
  return new Response(prelude).text()
}

beforeEach(() => vi.clearAllMocks())

describe('/portal/project', () => {
  it('shows no project data to a signed-out or aal1 visitor', async () => {
    const d = db([PROJECT], ITEMS)
    for (const access of [{ kind: 'sign_in' }, { kind: 'verify_second_factor' }] as PortalAccess[]) {
      const html = await render(access, d)
      expect(html).not.toContain('Optix')
      expect(html).not.toContain('Portal block review')
    }
  })

  it('shows health, hold, decisions, blockers and an unverified forecast honestly', async () => {
    const html = await render({ kind: 'ok', owner: OWNER as never }, db([PROJECT], ITEMS))
    expect(html).toContain('Optix ERP (synthetic)')
    expect(html).toContain('On hold')
    expect(html).toContain('Release on hold.')
    expect(html).toContain('Needs your decision')
    expect(html).toContain('Ready for your review')
    expect(html).toContain('Approved read-only data source not agreed')
    expect(html).toContain('Accepted by you, waiting for release')
    expect(html).toContain('ESTIMATE NOT YET VERIFIED')
    expect(html).toContain('not a confirmed decision')
    expect(html).toContain('AI summary, not yet confirmed')
    expect(html).not.toMatch(/\d+\s?%/)
    expect(renderedFindings(html)).toEqual([])
  })

  it('shows the accept control only on an item awaiting review', async () => {
    const html = await render({ kind: 'ok', owner: OWNER as never }, db([PROJECT], ITEMS))
    expect(html.match(/>Accept</g)).toHaveLength(1)
  })

  it('says the read failed instead of showing an empty project', async () => {
    const html = await render({ kind: 'ok', owner: OWNER as never }, db(null, ITEMS))
    expect(html).toContain('We could not load your project')
    expect(html).not.toContain('Nothing is waiting on you')
  })
})
