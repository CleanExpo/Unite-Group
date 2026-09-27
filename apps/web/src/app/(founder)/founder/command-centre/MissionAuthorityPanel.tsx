'use client'

// MissionAuthorityPanel — UNI-2779. Shows, for the selected mission, what the
// runner would do next and why: continue inside the accepted mission authority,
// or stop at a named action for the founder. Built from the stored
// continuation and the same nextStep() verdict the runner gets. Read on demand,
// like the build observations; nothing here writes.

import { useState } from 'react'
import type { MissionAuthorityView } from '@/lib/mission-authority/authority-view'
import type { InterruptionMetric } from '@/lib/mission-authority/interruptions'
import styles from './founder-desk.module.css'

const PROTECTED_BOUNDARY_CLASS = 'LEGITIMATE_PROTECTED_BOUNDARY'

export interface MissionAuthorityData {
  view: MissionAuthorityView
  interruptions: { metric: InterruptionMetric; truncated: boolean }
}

function rateText(metric: InterruptionMetric): string {
  if (metric.perVerifiedOutcome === null) {
    return `${metric.total} interruption${metric.total === 1 ? '' : 's'} recorded; no verified outcome yet, so there is no rate to show.`
  }
  return `${metric.perVerifiedOutcome.toFixed(2)} interruptions per verified outcome (${metric.total} across ${metric.verifiedOutcomes} verified outcome${metric.verifiedOutcomes === 1 ? '' : 's'}).`
}

function InterruptionSummary({ metric, truncated }: MissionAuthorityData['interruptions']) {
  return <section className={styles.interruptions} aria-label="Founder interruptions">
    <h4>Founder interruptions</h4>
    <p>{rateText(metric)}</p>
    <ul>{Object.entries(metric.byClass).map(([name, count]) => <li key={name} data-protected={name === PROTECTED_BOUNDARY_CLASS}>
      <span>{name}{name === PROTECTED_BOUNDARY_CLASS ? ' (the only class that justifies asking you)' : ''}</span><b>{count}</b>
    </li>)}</ul>
    {truncated && <p className={styles.helper}>Counts cover the most recent records only; older records were not read.</p>}
  </section>
}

export function MissionAuthorityPanelView({ data }: { data: MissionAuthorityData }) {
  const { view } = data
  return <div className={styles.authorityPanel}>
    {view.state === 'none' && <p>No mission continuation is recorded for this mission yet, so there is no authority decision to show.</p>}
    {view.state === 'invalid' && <p role="alert" className={styles.error}>The stored mission continuation is unreadable: {view.error}</p>}
    {view.state === 'ok' && <dl className={styles.authorityList} data-continuing={view.decision.continuing}>
      <div><dt>Mission</dt><dd>{view.missionRef ? `${view.missionRef} · ${view.missionId}` : view.missionId}</dd></div>
      <div><dt>Authority</dt><dd>{view.authority}</dd></div>
      <div><dt>Current</dt><dd>{view.phase} ({view.status})</dd></div>
      <div><dt>Next</dt><dd>{view.nextAction}</dd></div>
      {view.decision.continuing
        ? <div><dt>Why continuing</dt><dd>Inside accepted mission authority<small>{view.decision.why}</small></dd></div>
        : <>
          <div data-stop="true"><dt>Stopped at</dt><dd>{view.decision.stoppedAt}</dd></div>
          <div data-stop="true"><dt>Why</dt><dd>{view.decision.why}{view.decision.founderPacket && <small>{view.decision.founderPacket}</small>}</dd></div>
        </>}
    </dl>}
    <InterruptionSummary {...data.interruptions} />
  </div>
}

export function MissionAuthorityPanel({ taskId }: { taskId: string }) {
  const [data, setData] = useState<MissionAuthorityData | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function refresh() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/command-centre/missions/authority?taskId=${encodeURIComponent(taskId)}`, { credentials: 'include' })
      const body = await response.json() as MissionAuthorityData & { error?: string }
      if (!response.ok || body.view?.taskId !== taskId) throw new Error(body.error || 'Mission authority could not be matched to this mission.')
      setData(body)
    } catch (err) { setError(err instanceof Error ? err.message : 'Mission authority could not be read.') }
    finally { setBusy(false) }
  }
  return <section className={styles.observations} aria-label="Mission authority">
    <div className={styles.sectionHeading}><h3>Mission authority</h3><button className={styles.textButton} disabled={busy} onClick={() => void refresh()}>{busy ? 'Reading authority…' : data ? 'Refresh mission authority' : 'Check mission authority'}</button></div>
    <p className={styles.helper}>Whether this mission continues on its own or has stopped for you, read from the recorded continuation.</p>
    {error && <p role="alert" className={styles.error}>{error} {data ? 'The previous reading is out of date.' : ''}</p>}
    {data && <MissionAuthorityPanelView data={data} />}
  </section>
}
