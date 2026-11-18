import { describe, expect, it } from 'vitest'

import { ESTIMATE_NOT_VERIFIED, forecastView, formatAuDate } from '../forecast'
import { authorLabel, clientCanRespond, ITEM_STATES, STATE_LABEL, stateGroup } from '../state'

describe('project item states', () => {
  it('labels every state in plain English', () => {
    for (const s of ITEM_STATES) expect(STATE_LABEL[s]).toMatch(/\w/)
  })

  it('lets the client answer only an item awaiting review', () => {
    expect(ITEM_STATES.filter(clientCanRespond)).toEqual(['awaiting_client_review'])
  })

  it('shows client acceptance and a held release as awaiting release, never as released or failed', () => {
    expect(stateGroup('client_accepted')).toBe('accepted_awaiting_release')
    expect(stateGroup('approved_for_release')).toBe('accepted_awaiting_release')
    expect(stateGroup('deployed')).toBe('released')
    expect(stateGroup('blocked')).toBe('blocked')
    expect(stateGroup('clarification_required')).toBe('waiting_on_you')
  })

  it('labels bot-written text as not a confirmed decision', () => {
    expect(authorLabel('client_bot')).toMatch(/not a confirmed decision/)
    expect(authorLabel('client_human')).toBe('You')
  })
})

describe('forecast display', () => {
  const now = new Date('2026-11-19T00:00:00Z')

  it('says ESTIMATE NOT YET VERIFIED when any part of the forecast is missing', () => {
    const full = { window: 'Week of 1 Dec', basis: '3 days build + 2 days test', confidence: 'medium' as const, updatedAt: '2026-11-18T00:00:00Z' }
    expect(forecastView(full, now).kind).toBe('forecast')
    for (const missing of ['window', 'basis', 'confidence', 'updatedAt'] as const) {
      expect(forecastView({ ...full, [missing]: null }, now)).toEqual({ kind: 'unverified', text: ESTIMATE_NOT_VERIFIED })
    }
    expect(forecastView({ ...full, updatedAt: 'not a date' }, now).kind).toBe('unverified')
    expect(forecastView({ ...full, window: '   ' }, now).kind).toBe('unverified')
  })

  it('marks a forecast older than 14 days as stale instead of current', () => {
    const v = forecastView({ window: 'Mid Dec', basis: 'estimate', confidence: 'low', updatedAt: '2026-10-01T00:00:00Z' }, now)
    expect(v.kind === 'forecast' && v.stale).toBe(true)
    const fresh = forecastView({ window: 'Mid Dec', basis: 'estimate', confidence: 'low', updatedAt: '2026-11-15T00:00:00Z' }, now)
    expect(fresh.kind === 'forecast' && fresh.stale).toBe(false)
  })

  it('formats dates as DD/MM/YYYY in Brisbane time', () => {
    expect(formatAuDate('2026-11-18T22:00:00Z')).toBe('19/11/2026')
    expect(formatAuDate('nope')).toBe('unknown date')
  })
})
