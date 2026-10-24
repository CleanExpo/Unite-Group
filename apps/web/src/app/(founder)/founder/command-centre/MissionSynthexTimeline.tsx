'use client'

// MissionSynthexTimeline — SPM-audit G2. The Synthex witness events recorded
// for the selected mission, in the order the steps happened, with the
// structured fields the receiver kept (trial count and window, post status,
// schedule, full text, approve link, post URL, occurred time). Events that arrived with no mission id are listed separately
// so a sender gap is visible. Read on demand, like the authority panel;
// nothing here writes. States: reading, failed, none, rows.

import { useState } from 'react'
import type { SynthexMissionTimeline, SynthexTimelineEntry } from '@/lib/command-centre/synthex-mission-timeline'
import { linkedInPostUrl, synthexApproveUrl } from '@/lib/integrations/synthex-links'
import styles from './founder-desk.module.css'

function aest(value: string): string {
  return new Date(value).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' AEST'
}

function countLine(entry: SynthexTimelineEntry): string | null {
  if (entry.eventType === 'outcome.read_failed') return 'Trials: unknown — RA read failed'
  if (entry.eventType === 'outcome.trials') return `Trials: ${entry.count ?? 'not recorded'}`
  if (entry.count === null) return null
  return entry.eventType === 'content.outcomes' ? `Posts published: ${entry.count}` : `Count: ${entry.count}`
}

function TimelineItem({ entry }: { entry: SynthexTimelineEntry }) {
  const link = linkedInPostUrl(entry.postUrl)
  const approve = synthexApproveUrl(entry.approveUrl)
  const count = countLine(entry)
  const post = [entry.postId && `Post ${entry.postId}`, entry.platform].filter(Boolean).join(' · ')
  return <li data-event={entry.eventType}>
    <p className={styles.helper}>{entry.occurredAt
      ? <time dateTime={entry.occurredAt}>{aest(entry.occurredAt)}</time>
      : <>Occurred time not recorded (received <time dateTime={entry.receivedAt}>{aest(entry.receivedAt)}</time>)</>}</p>
    <p><strong>{entry.eventType}</strong> {entry.summary}</p>
    <p className={styles.synthexFacts}>
      {count && <span>{count}</span>}
      {entry.window && <span>Window: {entry.window}</span>}
      {entry.attributionKey && <span>Attribution: {entry.attributionKey}</span>}
      {entry.postUrl && <span>{link ? <a href={link} target="_blank" rel="noopener noreferrer">Open LinkedIn post</a> : `Post: ${entry.postUrl}`}</span>}
      {post && <span>{post}</span>}
      {entry.status && <span>Status: {entry.status.replaceAll('_', ' ')}</span>}
      {entry.scheduledAt && <span>Scheduled: {aest(entry.scheduledAt)}</span>}
      {entry.publishedAt && <span>Published: {aest(entry.publishedAt)}</span>}
      {entry.businessSlug && <span>Business: {entry.businessSlug}</span>}
      <span>Mission id: {entry.missionId}</span>
    </p>
    {entry.text && <details className={styles.details}><summary>Post text</summary><p className={styles.synthexPostText}>{entry.text}</p></details>}
    {entry.thumbnailUrls.length > 0 && <p className={styles.synthexFacts}>{entry.thumbnailUrls.map(url => <span key={url}>Media: {url}</span>)}</p>}
    {entry.approveUrl && <p>{approve
      ? <a className={styles.resultLink} href={approve} target="_blank" rel="noopener noreferrer">Review and approve in Synthex</a>
      : `Approve link (not Synthex, not linked): ${entry.approveUrl}`}</p>}
  </li>
}

export function MissionSynthexTimelineView({ data }: { data: SynthexMissionTimeline }) {
  return <div className={styles.observationGrid}>
    {data.entries.length === 0
      ? <p>No Synthex events are recorded for this mission yet.</p>
      : <ol aria-label="Synthex events for this mission">{data.entries.map(entry => <TimelineItem key={entry.id} entry={entry} />)}</ol>}
    {data.unlinked.length > 0 && <>
      <h4>Synthex events with no mission id</h4>
      <p className={styles.helper}>These arrived without a mission id, so they cannot be placed on any mission timeline. Newest first.</p>
      <ul aria-label="Synthex events with no mission id">{data.unlinked.map(event => <li key={event.id}>
        <time dateTime={event.receivedAt}>{aest(event.receivedAt)}</time> <strong>{event.eventType ?? 'unknown'}</strong> {event.target}
      </li>)}</ul>
    </>}
    {data.truncated && <p className={styles.helper}>Only the most recent records were read; older ones are not shown.</p>}
  </div>
}

export function MissionSynthexTimeline({ taskId }: { taskId: string }) {
  const [data, setData] = useState<SynthexMissionTimeline | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function refresh() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/command-centre/missions/synthex?taskId=${encodeURIComponent(taskId)}`, { credentials: 'include' })
      const body = await response.json() as SynthexMissionTimeline & { error?: string }
      if (!response.ok || body.taskId !== taskId) throw new Error(body.error || 'Synthex activity could not be matched to this mission.')
      setData(body)
    } catch (err) { setError(err instanceof Error ? err.message : 'Synthex activity could not be read.') }
    finally { setBusy(false) }
  }
  return <section className={styles.observations} aria-label="Synthex activity">
    <div className={styles.sectionHeading}><h3>Synthex activity</h3><button className={styles.textButton} disabled={busy} onClick={() => void refresh()}>{busy ? 'Reading Synthex activity…' : data ? 'Refresh Synthex activity' : 'Show Synthex activity'}</button></div>
    <p className={styles.helper}>Witness events Synthex sent for this mission, in the order the steps happened. Recording an event never changes the mission’s status.</p>
    {error && <p role="alert" className={styles.error}>{error} {data ? 'The previous reading is out of date.' : ''}</p>}
    {data && <MissionSynthexTimelineView data={data} />}
  </section>
}
