// UNI-2234 — CRM Mission Control read path (slice 3) tests.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import {
  loadCrmMissionControlJobs,
  mapCrmMissionControlJob,
} from '@/lib/command-centre/crm-mission-control-jobs-supabase'

// Fake founder client: from(...).select(...).eq(...).eq(...).order(...).limit(n) → {data,error}
function fakeDb(opts: { data?: unknown[]; error?: string } = {}) {
  const builder = {
    eq() {
      return this
    },
    order() {
      return this
    },
    async limit() {
      return { data: opts.error ? null : opts.data ?? [], error: opts.error ? { message: opts.error } : null }
    },
  }
  return { from: () => ({ select: () => builder }) }
}

describe('mapCrmMissionControlJob', () => {
  it('prefers metadata state/subject/reason and reads admitted', () => {
    const view = mapCrmMissionControlJob({
      id: 'job_1',
      task_type: 'lead_conversion',
      status: 'blocked',
      metadata: { subjectType: 'lead_conversion', missionControlState: 'queued', reason: 'l1_confidence_and_no_link_ok', admitted: true },
      created_at: '2026-07-10T00:00:00.000Z',
    })
    expect(view).toEqual({
      id: 'job_1',
      subjectType: 'lead_conversion',
      missionControlState: 'queued',
      reason: 'l1_confidence_and_no_link_ok',
      admitted: true,
      createdAt: '2026-07-10T00:00:00.000Z',
    })
  })

  it('falls back to row columns when metadata is absent', () => {
    const view = mapCrmMissionControlJob({ id: 'job_2', task_type: 'lead_conversion', status: 'blocked', metadata: null, created_at: null })
    expect(view.subjectType).toBe('lead_conversion')
    expect(view.missionControlState).toBe('blocked')
    expect(view.reason).toBeNull()
    expect(view.admitted).toBe(false)
  })
})

describe('loadCrmMissionControlJobs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns not_connected without a founder (no fabricated rows)', async () => {
    const res = await loadCrmMissionControlJobs(null)
    expect(res).toEqual({ jobs: [], source: 'not_connected' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('returns connected + mapped jobs for a founder', async () => {
    vi.mocked(createClient).mockResolvedValue(
      fakeDb({
        data: [
          { id: 'job_a', task_type: 'lead_conversion', status: 'blocked', metadata: { missionControlState: 'needs_review', subjectType: 'lead_conversion', reason: 'kill_switch_off' }, created_at: '2026-07-10T01:00:00.000Z' },
        ],
      }) as never,
    )
    const res = await loadCrmMissionControlJobs('founder_1')
    expect(res.source).toBe('connected')
    expect(res.jobs).toHaveLength(1)
    expect(res.jobs[0]).toMatchObject({ id: 'job_a', missionControlState: 'needs_review', subjectType: 'lead_conversion' })
  })

  it('returns error honestly on a query failure (never fabricates)', async () => {
    vi.mocked(createClient).mockResolvedValue(fakeDb({ error: 'rls denied' }) as never)
    const res = await loadCrmMissionControlJobs('founder_1')
    expect(res.source).toBe('error')
    expect(res.jobs).toEqual([])
    expect(res.error).toContain('rls denied')
  })
})
