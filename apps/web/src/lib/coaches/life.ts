// src/lib/coaches/life.ts
// Life Coach data fetcher — calendar events + Gmail threads for today

import type { CoachContext, CoachDataFetcher } from './types'
import {
  fetchCalendarEvents,
  fetchGmailThreads,
  isGoogleConfigured,
  getMockEvents,
  getMockThreads,
} from '@/lib/integrations/google'

export const fetchLifeData: CoachDataFetcher = async (founderId: string): Promise<CoachContext> => {
  const today = new Date()
  const reportDate = today.toISOString().split('T')[0]

  let events
  let threads
  let eventsSource: 'live' | 'mock' | 'error'
  let threadsSource: 'live' | 'mock' | 'error'

  if (isGoogleConfigured()) {
    try {
      const [eventsResult, threadsResult] = await Promise.all([
        fetchCalendarEvents(founderId),
        fetchGmailThreads(founderId),
      ])

      if (eventsResult.source === 'not_connected') {
        events = getMockEvents()
        eventsSource = 'mock'
      } else {
        events = eventsResult.data
        eventsSource = eventsResult.source === 'error' ? 'error' : 'live'
      }

      if (threadsResult.source === 'not_connected') {
        threads = getMockThreads()
        threadsSource = 'mock'
      } else {
        threads = threadsResult.data
        threadsSource = threadsResult.source === 'error' ? 'error' : 'live'
      }
    } catch (err) {
      console.warn('[Life Coach] Google API error, falling back to mocks:', err)
      events = getMockEvents()
      threads = getMockThreads()
      eventsSource = 'mock'
      threadsSource = 'mock'
    }
  } else {
    events = getMockEvents()
    threads = getMockThreads()
    eventsSource = 'mock'
    threadsSource = 'mock'
  }

  // Overall data provenance: 'mock' if any stream is placeholder, 'error' if a
  // stream degraded, else 'live'. Surfaced so the coach brief never presents
  // mock calendar/email as the founder's real data (mirrors revenue.ts, which
  // propagates a per-business source — UNI-2216).
  const source: 'live' | 'mock' | 'error' =
    eventsSource === 'mock' || threadsSource === 'mock'
      ? 'mock'
      : eventsSource === 'error' || threadsSource === 'error'
        ? 'error'
        : 'live'

  // Filter to today's events
  const todayStr = reportDate
  const todayEvents = events.filter((e) => e.start.startsWith(todayStr))

  return {
    coachType: 'life',
    reportDate,
    data: {
      events: todayEvents.map((e) => ({
        title: e.title,
        start: e.start,
        end: e.end,
        businessKey: e.businessKey,
      })),
      threads: threads.map((t) => ({
        subject: t.subject,
        from: t.from,
        snippet: t.snippet,
        unread: t.unread,
        businessKey: t.businessKey,
      })),
      totalEvents: todayEvents.length,
      totalThreads: threads.length,
      unreadThreads: threads.filter((t) => t.unread).length,
      eventsSource,
      threadsSource,
      source,
    },
  }
}
