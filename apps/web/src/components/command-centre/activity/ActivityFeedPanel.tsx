'use client'

// ActivityFeedPanel — live wiring for the agent activity feed (UNI-2137).
//
// Fetches /api/command-centre/activity-feed on mount and polls every 15s,
// then hands the derived rows to ActivityLog. On a 503 or a fetch failure it
// shows the DegradedDataBanner and ActivityLog falls back to its honest empty
// `seed` state (no fabricated rows). Mirrors the poll/degrade pattern used by
// LiveAgentOperationsMap so the two panels behave identically.

import { useEffect, useState } from 'react'
import { ActivityLog } from './ActivityLog'
import type { ActivityDatum } from './activity-data'
import { DegradedDataBanner } from '../DegradedDataBanner'
import { StaleReadNotice } from '@/components/ui/StaleReadNotice'

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
        const res = await fetch('/api/command-centre/activity-feed', { cache: 'no-store' })
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

  // `degraded` already suppresses ActivityLog's event COUNT and its "no
  // activity yet" line — both claims that a read succeeded. The rows themselves
  // were left: after a successful poll and then a failed one, `payload` is
  // retained and every event still renders as though it were current, under a
  // banner that says the read failed. That is the same shape the sibling tiles
  // were drained for, and the distinction matters here because the feed is
  // read as a live log — an event list that has silently stopped advancing is
  // worse than one that admits it. Read-only panel, so no `actionsDisabled`.
  //
  // `payload !== null` is load-bearing: on a FIRST-read failure payload is null,
  // ActivityLog falls back to its seed data behind a `seed` badge, and that is
  // the existing honest cold-start path, not a stale read. [UNI-2476]
  const staleRead = Boolean(error) && payload !== null

  return (
    <div className="flex flex-col" data-stale-read={staleRead ? 'true' : undefined}>
      {error && <DegradedDataBanner source="Activity Log" reason={error} />}
      {staleRead && <StaleReadNotice source="Activity Log" />}
      <ActivityLog
        events={payload?.events}
        sourceLiveAt={payload?.sourceLiveAt ?? undefined}
        degraded={Boolean(error)}
      />
    </div>
  )
}
