import { describe, expect, it } from 'vitest'

import { ESTIMATE_NOT_VERIFIED, forecastView, formatAuDate } from '../forecast'
import { authorLabel, clientActions, ITEM_STATES, STATE_LABEL, stateGroup, type WaitingOn } from '../state'

describe('project item states', () => {
  it('labels every state in plain English', () => {
    for (const s of ITEM_STATES) expect(STATE_LABEL[s]).toMatch(/\w/)
  })

  it('gives the client actions only on review, and an answer only when the team asked the client', () => {
    const waits: WaitingOn[] = ['client', 'unite', 'third_party', 'none']
    const withActions = ITEM_STATES.flatMap((st) => waits.filter((w) => clientActions(st, w).length > 0).map((w) => `${st}/${w}`))
    expect(withActions).toEqual([
      'clarification_required/client',
      'awaiting_client_review/client', 'awaiting_client_review/unite', 'awaiting_client_review/third_party', 'awaiting_client_review/none',
    ])
    expect(clientActions('awaiting_client_review', 'client')).toEqual(['accept', 'request_changes'])
    expect(clientActions('clarification_required', 'client')).toEqual(['answer'])
  })

  it('says "waiting on you" exactly when the client has an action, for every state', () => {
    for (const st of ITEM_STATES) for (const w of ['client', 'unite', 'third_party', 'none'] as WaitingOn[]) {
      expect(stateGroup(st, w) === 'waiting_on_you').toBe(clientActions(st, w).length > 0)
    }
  })

  it('shows client acceptance and a held release as awaiting release, never as released or failed', () => {
    expect(stateGroup('client_accepted')).toBe('accepted_awaiting_release')
    expect(stateGroup('approved_for_release')).toBe('accepted_awaiting_release')
    expect(stateGroup('deployed')).toBe('released')
    expect(stateGroup('blocked')).toBe('blocked')
    expect(stateGroup('clarification_required', 'client')).toBe('waiting_on_you')
    expect(stateGroup('clarification_required', 'unite')).toBe('in_progress')
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
