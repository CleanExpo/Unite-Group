import { describe, it, expect } from 'vitest'
import { buildLifeUserMessage } from '../life'

const base = { events: [], threads: [], todayDate: '2026-07-01' }

describe('buildLifeUserMessage source caveat (UNI-2216)', () => {
  it('adds a PLACEHOLDER caveat naming calendar when eventsSource is mock', () => {
    const msg = buildLifeUserMessage({ ...base, eventsSource: 'mock', threadsSource: 'live' })
    expect(msg).toContain('PLACEHOLDER')
    expect(msg.toLowerCase()).toContain('calendar')
    expect(msg.toLowerCase()).not.toContain('email and')
  })

  it('names both calendar and email when both are placeholder', () => {
    const msg = buildLifeUserMessage({ ...base, eventsSource: 'mock', threadsSource: 'error' })
    expect(msg).toContain('calendar and email')
  })

  it('omits the caveat when both sources are live', () => {
    const msg = buildLifeUserMessage({ ...base, eventsSource: 'live', threadsSource: 'live' })
    expect(msg).not.toContain('PLACEHOLDER')
  })

  it('omits the caveat when sources are undefined (back-compat)', () => {
    const msg = buildLifeUserMessage(base)
    expect(msg).not.toContain('PLACEHOLDER')
  })
})
