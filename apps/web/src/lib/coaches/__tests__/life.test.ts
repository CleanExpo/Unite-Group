import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/integrations/google', () => ({
  isGoogleConfigured: vi.fn(),
  fetchCalendarEvents: vi.fn(),
  fetchGmailThreads: vi.fn(),
  getMockEvents: vi.fn(() => []),
  getMockThreads: vi.fn(() => []),
}))

import {
  isGoogleConfigured,
  fetchCalendarEvents,
  fetchGmailThreads,
} from '@/lib/integrations/google'
import { fetchLifeData } from '../life'

describe('fetchLifeData source propagation (UNI-2216)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marks source mock when Google is not configured', async () => {
    vi.mocked(isGoogleConfigured).mockReturnValue(false)
    const ctx = await fetchLifeData('founder-1')
    expect(ctx.data.eventsSource).toBe('mock')
    expect(ctx.data.threadsSource).toBe('mock')
    expect(ctx.data.source).toBe('mock')
  })

  it('marks source live when calendar and gmail both return real data', async () => {
    vi.mocked(isGoogleConfigured).mockReturnValue(true)
    vi.mocked(fetchCalendarEvents).mockResolvedValue({ data: [], source: 'google' } as never)
    vi.mocked(fetchGmailThreads).mockResolvedValue({ data: [], source: 'gmail' } as never)
    const ctx = await fetchLifeData('founder-1')
    expect(ctx.data.eventsSource).toBe('live')
    expect(ctx.data.threadsSource).toBe('live')
    expect(ctx.data.source).toBe('live')
  })

  it('marks a not_connected stream as mock and the overall source as mock', async () => {
    vi.mocked(isGoogleConfigured).mockReturnValue(true)
    vi.mocked(fetchCalendarEvents).mockResolvedValue({ data: [], source: 'not_connected' } as never)
    vi.mocked(fetchGmailThreads).mockResolvedValue({ data: [], source: 'gmail' } as never)
    const ctx = await fetchLifeData('founder-1')
    expect(ctx.data.eventsSource).toBe('mock')
    expect(ctx.data.threadsSource).toBe('live')
    expect(ctx.data.source).toBe('mock')
  })

  it('marks source mock on a Google API exception', async () => {
    vi.mocked(isGoogleConfigured).mockReturnValue(true)
    vi.mocked(fetchCalendarEvents).mockRejectedValue(new Error('boom'))
    vi.mocked(fetchGmailThreads).mockResolvedValue({ data: [], source: 'gmail' } as never)
    const ctx = await fetchLifeData('founder-1')
    expect(ctx.data.source).toBe('mock')
  })
})
