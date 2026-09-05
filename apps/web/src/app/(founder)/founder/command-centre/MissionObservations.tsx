'use client'

import { useState } from 'react'
import type { DeliveryObservations } from '@/lib/command-centre/delivery-observations'
import styles from './founder-desk.module.css'

/** A read-only provider snapshot. It must never promote the mission's stage. */
export function MissionObservations({ taskId, specVersion }: { taskId: string; specVersion: string | null }) {
  const [snapshot, setSnapshot] = useState<DeliveryObservations | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function refresh() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/command-centre/missions/observations', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId }),
      })
      const data = await response.json() as DeliveryObservations & { error?: string }
      if (!response.ok || data.taskId !== taskId || data.specVersion !== specVersion) throw new Error(data.error || 'The evidence snapshot could not be matched to this mission. Refresh the mission and try again.')
      setSnapshot(data)
    } catch (err) { setError(err instanceof Error ? err.message : 'Evidence could not be refreshed.') }
    finally { setBusy(false) }
  }
  return <section className={styles.observations} aria-label="Current build observations">
    <div className={styles.sectionHeading}><h3>Build observations</h3><button className={styles.textButton} disabled={busy} onClick={() => void refresh()}>{busy ? 'Reading evidence…' : 'Refresh build evidence'}</button></div>
    <p className={styles.helper}>Read the saved build’s current checks, reviews and deployments. These observations do not establish live delivery.</p>
    {error && <p role="alert" className={styles.error}>{error} {snapshot ? 'The previous snapshot is out of date.' : ''}</p>}
    {snapshot && <div className={styles.observationGrid} data-stale={!!error}>
      <p className={styles.helper}>GitHub snapshot: {snapshot.state.replaceAll('_', ' ')}. Recorded {new Date(snapshot.observedAt).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' })} AEST.</p>
      <h4>Automated checks</h4><p>{snapshot.checks.state === 'unavailable' ? 'Checks unavailable.' : snapshot.checks.items.length === 0 ? 'No checks observed.' : null}</p>
      <ul>{snapshot.checks.items.map(check => <li key={check.receiptId}>{check.name}: {check.conclusion || check.status}</li>)}</ul>
      <h4>Commit statuses</h4>
      {snapshot.statuses.state === 'unavailable' ? <p>Commit statuses unavailable.</p> : snapshot.statuses.state === 'partial' ? <p>Commit status coverage is incomplete.</p> : snapshot.statuses.items.length === 0 ? <p>No commit statuses observed.</p> : null}
      {snapshot.statuses.detail && <p className={styles.helper}>{snapshot.statuses.detail}</p>}
      <ul>{snapshot.statuses.items.map(status => <li key={status.receiptId}>{status.context}: {status.state}</li>)}</ul>
      <h4>Reviews</h4><p>{snapshot.reviews.state === 'unavailable' ? 'Reviews unavailable.' : snapshot.reviews.items.length === 0 ? 'No reviews observed.' : null}</p>
      <ul>{snapshot.reviews.items.map(review => <li key={review.receiptId}>{review.reviewer || 'Reviewer unavailable'}: {review.state.toLowerCase().replaceAll('_', ' ')}{!review.currentHead ? ' (older code version)' : ''}</li>)}</ul>
      <h4>Deployments</h4><p>{snapshot.deployments.state === 'unavailable' ? 'Deployments unavailable.' : snapshot.deployments.items.length === 0 ? 'No deployments observed for this code version.' : null}</p>
      <ul>{snapshot.deployments.items.map(deployment => <li key={deployment.receiptId}>{deployment.environment}: {deployment.state}</li>)}</ul>
      <p className={styles.helper}>Live user verification is not connected.</p>
      <details className={styles.details}><summary>Snapshot coverage</summary><ul>{snapshot.limitations.map((limitation, i) => <li key={i}>{limitation}</li>)}</ul></details>
    </div>}
  </section>
}
