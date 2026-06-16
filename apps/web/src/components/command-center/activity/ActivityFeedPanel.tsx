'use client'

// ActivityFeedPanel — live wiring for the agent activity feed (UNI-2137).
//
// Fetches /api/command-center/activity-feed on mount and polls every 15s,
// then hands the derived rows to ActivityLog. On a 503 or a fetch failure it
// shows the DegradedDataBanner and ActivityLog falls back to its honest empty
// `seed` state (no fabricated rows). Mirrors the poll/degrade pattern used by
// LiveAgentOperationsMap so the two panels behave identically.

import { useEffect, useState } from 'react'
import { ActivityLog } from './ActivityLog'
import type { ActivityDatum } from './activity-data'
import { DegradedDataBanner } from '../DegradedDataBanner'

interface ActivityFeedPayload {
  source: 'cc:activity'
  generatedAt: string
  events: ActivityDatum[]
  sourceLiveAt: string | null
}

const POLL_MS = 15000

export function ActivityFeedPanel() {
  const [payload, setPayload] = useState<ActivityFeedPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadActivity() {
      try {
        const res = await fetch('/api/command-center/activity-feed', { cache: 'no-store' })
        if (!res.ok) throw new Error(`activity_feed_http_${res.status}`)
        const body = (await res.json()) as ActivityFeedPayload
        if (cancelled) return
        setPayload(body)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'activity_feed_fetch_failed')
      }
    }

    void loadActivity()
    const id = window.setInterval(loadActivity, POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  return (
    <div className="flex flex-col">
      {error && <DegradedDataBanner source="Activity Log" reason={error} />}
      <ActivityLog
        events={payload?.events}
        sourceLiveAt={payload?.sourceLiveAt ?? undefined}
      />
    </div>
  )
}
