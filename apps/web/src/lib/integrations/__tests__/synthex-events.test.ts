import { describe, it, expect } from 'vitest'
import { resolveBusinessSlug, summariseEvent, synthexEventDetail, synthexEventSchema, toAgentEventInput } from '../synthex-events'

const base = { type: 'campaign.started', source: 'synthex' as const, timestamp: '2026-10-19T01:00:00.000Z' }

describe('synthex-events mapping', () => {
  it('resolves aliases, lowercases, and returns null when absent', () => {
    expect(resolveBusinessSlug('ccw')).toBe('ccw-crm')
    expect(resolveBusinessSlug('NRPG')).toBe('dr-nrpg')
    expect(resolveBusinessSlug('Other')).toBe('other')
    expect(resolveBusinessSlug(undefined)).toBeNull()
    expect(resolveBusinessSlug('  ')).toBeNull()
  })

  it('summarises known and unknown types', () => {
    expect(summariseEvent({ ...base, orgSlug: 'x' })).toBe('Synthex campaign started for x')
    expect(summariseEvent({ ...base, type: 'revenue.daily' })).toBe('Synthex daily revenue snapshot')
    expect(summariseEvent({ ...base, type: 'brand.new' })).toBe('Synthex event: brand.new')
  })

  it('caps the target at 512 and keeps it on one line', () => {
    const e = { ...base, type: 'content.published', platform: 'a\nb'.repeat(400) }
    const s = summariseEvent(e)
    expect(s.length).toBeLessThanOrEqual(512)
    expect(s).not.toContain('\n')
  })

  it('maps to the fixed cc_agent_events shape', () => {
    expect(toAgentEventInput({ ...base, orgSlug: 'nrpg' })).toEqual({
      agentName: 'synthex', surface: 'local', machine: 'synthex.social', projectKey: 'dr-nrpg',
      eventType: 'status', toolName: 'campaign.started', planKey: null,
      target: 'Synthex campaign started for nrpg · no mission id · occurred 2026-10-19T01:00:00.000Z',
    })
    expect(toAgentEventInput(base).projectKey).toBeNull()
  })

  it('schema passes unknown fields through but requires source=synthex', () => {
    expect(synthexEventSchema.safeParse({ ...base, extra: 1 }).success).toBe(true)
    expect(synthexEventSchema.safeParse({ ...base, source: 'x' }).success).toBe(false)
  })
})

// SPM-audit G2 (eng C1/C2/K1): every accepted event keeps its structured fields.
describe('synthex-events structured detail', () => {
  const MISSION = '7f1d1b64-9a54-4f2b-9a2f-3f5f1d0c7a11'
  const trials = {
    ...base, type: 'outcome.trials', orgSlug: 'restoreassist', count: 3,
    window: '2026-10-12/2026-10-18', attributionKey: 'utm_source=synthex', occurredAt: '2026-10-19T00:30:00.000Z',
  }
  const parse = (e: Record<string, unknown>) => synthexEventSchema.safeParse(e)

  it('keeps count, window, attribution key and occurredAt for outcome.trials, with a null missionId when omitted', () => {
    const e = parse(trials)
    expect(e.success).toBe(true)
    expect(synthexEventDetail(e.data!)).toEqual({
      missionId: null, eventType: 'outcome.trials', occurredAt: '2026-10-19T00:30:00.000Z', sentAt: base.timestamp,
      orgSlug: 'restoreassist', platform: null, count: 3, window: '2026-10-12/2026-10-18',
      attributionKey: 'utm_source=synthex', url: null,
    })
  })

  it('keeps the post URL for content.published and the missionId when sent; occurredAt falls back to timestamp', () => {
    const url = 'https://www.linkedin.com/feed/update/urn:li:activity:7000000000000000000/'
    const e = parse({ ...base, type: 'content.published', platform: 'linkedin', url, missionId: MISSION })
    expect(synthexEventDetail(e.data!)).toMatchObject({ missionId: MISSION, url, platform: 'linkedin', occurredAt: base.timestamp, count: null, window: null })
  })

  it('maps the live content.outcomes digest (postsPublished, isoWeek) to count and window', () => {
    const e = parse({ ...base, type: 'content.outcomes', orgSlug: 'ccw', isoWeek: '2026-W42', postsPublished: 0 })
    expect(synthexEventDetail(e.data!)).toMatchObject({ count: 0, window: '2026-W42' })
  })

  it('rejects malformed structured fields rather than storing them', () => {
    expect(parse({ ...trials, count: -1 }).success).toBe(false)
    expect(parse({ ...trials, count: 1.5 }).success).toBe(false)
    expect(parse({ ...trials, count: '3' }).success).toBe(false)
    expect(parse({ ...trials, window: 'a\nb' }).success).toBe(false)
    expect(parse({ ...trials, window: 'w'.repeat(65) }).success).toBe(false)
    expect(parse({ ...base, type: 'content.published', url: 'http://www.linkedin.com/x' }).success).toBe(false)
    expect(parse({ ...base, type: 'content.published', url: 'https://u:p@www.linkedin.com/x' }).success).toBe(false)
    expect(parse({ ...base, type: 'content.published', url: 'not a url' }).success).toBe(false)
    expect(parse({ ...trials, occurredAt: 'yesterday' }).success).toBe(false)
  })

  it('requires count and window on outcome.trials and forbids a count on outcome.read_failed', () => {
    const { count: _c, ...noCount } = trials
    const { window: _w, ...noWindow } = trials
    expect(parse(noCount).success).toBe(false)
    expect(parse(noWindow).success).toBe(false)
    expect(parse({ ...trials, type: 'outcome.read_failed' }).success).toBe(false)
    const { count: _c2, ...failed } = { ...trials, type: 'outcome.read_failed' }
    expect(parse(failed).success).toBe(true)
  })

  it('summarises all six mission steps plus a failed read, showing zero as 0', () => {
    const s = (e: Record<string, unknown>) => summariseEvent(parse({ ...base, orgSlug: 'restoreassist', ...e }).data!)
    expect(s({ type: 'campaign.planned' })).toBe('Synthex planned a campaign for restoreassist')
    expect(s({ type: 'content.drafted', platform: 'linkedin' })).toBe('Synthex drafted a linkedin post for restoreassist')
    expect(s({ type: 'content.held_for_review' })).toBe('Synthex held a draft for human review for restoreassist')
    expect(s({ type: 'content.approved' })).toBe('A Synthex draft was approved for restoreassist')
    expect(s({ type: 'content.published', platform: 'linkedin', url: 'https://www.linkedin.com/feed/update/1' }))
      .toBe('Synthex published a linkedin post for restoreassist: https://www.linkedin.com/feed/update/1')
    expect(s({ type: 'content.published', platform: 'linkedin' })).toBe('Synthex published a linkedin post for restoreassist (post link not sent)')
    expect(s({ type: 'outcome.trials', count: 0, window: '2026-10-12/2026-10-18', attributionKey: 'utm_source=synthex' }))
      .toBe('Synthex outcome: 0 trials attributed to utm_source=synthex in 2026-10-12/2026-10-18 for restoreassist')
    expect(s({ type: 'outcome.trials', count: 1, window: '2026-W42' }))
      .toBe('Synthex outcome: 1 trial (attribution key not sent) in 2026-W42 for restoreassist')
    expect(s({ type: 'outcome.read_failed', window: '2026-W42' }))
      .toBe('Synthex outcome: trials unknown — RA read failed in 2026-W42 for restoreassist')
  })

  it('puts the missionId in plan_key and shows a missing one and the occurred time on the wall row', () => {
    const linked = toAgentEventInput(parse({ ...base, missionId: MISSION, occurredAt: '2026-10-19T00:59:00.000Z' }).data!)
    expect(linked.planKey).toBe(MISSION)
    expect(linked.target).toBe('Synthex campaign started · occurred 2026-10-19T00:59:00.000Z')
    const unlinked = toAgentEventInput(parse(trials).data!)
    expect(unlinked.planKey).toBeNull()
    expect(unlinked.target).toBe('Synthex outcome: 3 trials attributed to utm_source=synthex in 2026-10-12/2026-10-18 for restoreassist · no mission id · occurred 2026-10-19T00:30:00.000Z')
  })
})
