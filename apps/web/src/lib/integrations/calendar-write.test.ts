import { describe, it, expect } from 'vitest'

import { buildEventBody } from './calendar-write'

describe('buildEventBody', () => {
  it('builds a valid event, defaulting to AEST', () => {
    const body = buildEventBody({
      title: 'Site inspection',
      startIso: '2026-07-15T09:00:00+10:00',
      endIso: '2026-07-15T10:00:00+10:00',
    })
    expect(body).toMatchObject({
      summary: 'Site inspection',
      start: { dateTime: '2026-07-15T09:00:00+10:00', timeZone: 'Australia/Brisbane' },
      end: { dateTime: '2026-07-15T10:00:00+10:00', timeZone: 'Australia/Brisbane' },
    })
    expect(body.description).toBeUndefined()
  })

  it('honours an explicit time zone and description', () => {
    const body = buildEventBody({
      title: 'Call',
      startIso: '2026-07-15T09:00:00Z',
      endIso: '2026-07-15T09:30:00Z',
      description: 'Insurer follow-up',
      timeZone: 'Pacific/Auckland',
    })
    expect(body.start.timeZone).toBe('Pacific/Auckland')
    expect(body.description).toBe('Insurer follow-up')
  })

  it('rejects an empty title', () => {
    expect(() =>
      buildEventBody({ title: '  ', startIso: '2026-07-15T09:00:00Z', endIso: '2026-07-15T10:00:00Z' })
    ).toThrow(/title is required/)
  })

  it('rejects end <= start', () => {
    expect(() =>
      buildEventBody({ title: 'x', startIso: '2026-07-15T10:00:00Z', endIso: '2026-07-15T09:00:00Z' })
    ).toThrow(/end must be after start/)
  })

  it('rejects invalid dates', () => {
    expect(() =>
      buildEventBody({ title: 'x', startIso: 'not-a-date', endIso: '2026-07-15T10:00:00Z' })
    ).toThrow(/valid ISO dates/)
  })
})
