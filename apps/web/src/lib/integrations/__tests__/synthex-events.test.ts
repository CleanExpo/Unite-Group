import { describe, it, expect } from 'vitest'
import { resolveBusinessSlug, summariseEvent, synthexEventSchema, toAgentEventInput } from '../synthex-events'

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
      eventType: 'status', toolName: 'campaign.started', target: 'Synthex campaign started for nrpg',
    })
    expect(toAgentEventInput(base).projectKey).toBeNull()
  })

  it('schema passes unknown fields through but requires source=synthex', () => {
    expect(synthexEventSchema.safeParse({ ...base, extra: 1 }).success).toBe(true)
    expect(synthexEventSchema.safeParse({ ...base, source: 'x' }).success).toBe(false)
  })
})
