'use client'

import { useState } from 'react'
import { ListPlus, RefreshCw } from 'lucide-react'
import styles from './command-deck.module.css'

interface WorkPacketPreviewResponse {
  count?: number
  error?: string
}

interface WorkPacketQueueResponse {
  count?: number
  queuedCount?: number
  skippedExistingCount?: number
  error?: string
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string }
    if (typeof data.error === 'string' && data.error) return data.error
  } catch {
    // fall through to HTTP status
  }
  return `${fallback} (HTTP ${res.status})`
}

export function ProjectIntegrationWorkPacketControl() {
  const [draftCount, setDraftCount] = useState<number | null>(null)
  const [queuedCount, setQueuedCount] = useState<number | null>(null)
  const [skippedCount, setSkippedCount] = useState<number | null>(null)
  const [busy, setBusy] = useState<'preview' | 'queue' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function previewPackets() {
    if (busy) return
    setBusy('preview')
    setError(null)
    try {
      const res = await fetch('/api/command-centre/project-integrations/work-packets', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!res.ok) {
        setError(await readError(res, 'Could not inspect manifest gaps'))
        return
      }
      const data = (await res.json()) as WorkPacketPreviewResponse
      setDraftCount(typeof data.count === 'number' ? data.count : 0)
    } catch {
      setError('Network error')
    } finally {
      setBusy(null)
    }
  }

  async function queuePackets() {
    if (busy) return
    setBusy('queue')
    setError(null)
    try {
      const res = await fetch('/api/command-centre/project-integrations/work-packets', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: true }),
      })
      if (!res.ok) {
        setError(await readError(res, 'Could not queue manifest gaps'))
        return
      }
      const data = (await res.json()) as WorkPacketQueueResponse
      setDraftCount(typeof data.count === 'number' ? data.count : 0)
      setQueuedCount(typeof data.queuedCount === 'number' ? data.queuedCount : 0)
      setSkippedCount(typeof data.skippedExistingCount === 'number' ? data.skippedExistingCount : 0)
    } catch {
      setError('Network error')
    } finally {
      setBusy(null)
    }
  }

  const disabled = busy !== null

  return (
    <div className={styles.integrationActions} aria-live="polite">
      <button
        type="button"
        className={styles.iconCommand}
        onClick={previewPackets}
        disabled={disabled}
        aria-label="Refresh manifest gap work packets"
        title="Refresh manifest gap work packets"
      >
        <RefreshCw size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={styles.queueCommand}
        onClick={queuePackets}
        disabled={disabled}
        aria-label="Queue manifest gap work packets"
      >
        <ListPlus size={14} aria-hidden="true" />
        <span>{busy === 'queue' ? 'Queueing' : 'Queue gaps'}</span>
      </button>
      <span className={styles.integrationActionStatus}>
        {error
          ? error
          : queuedCount !== null
            ? `${queuedCount} queued - ${skippedCount ?? 0} existing`
            : draftCount !== null
              ? `${draftCount} gaps`
              : 'Ready'}
      </span>
    </div>
  )
}
