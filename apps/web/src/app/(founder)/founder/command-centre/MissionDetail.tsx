'use client'

import { useState } from 'react'
import type { DeliveryMissionView, DeliveryRequest, DeliveryStage } from '@/lib/command-centre/delivery-types'
import styles from './founder-desk.module.css'
import { MissionObservations } from './MissionObservations'

export const MISSION_STAGE_LABELS: Record<DeliveryStage, string> = {
  captured: 'Idea captured', needs_clarification: 'Needs your input', preparing: 'Preparing the brief',
  ready_for_review: 'Ready for your review', queued: 'Waiting to start', building: 'Building',
  review: 'Reviewing the result', release_blocked: 'Release needs attention', failed: 'Needs attention',
}

const KNOWLEDGE_STATE_LABELS = {
  available: 'Relevant saved knowledge found',
  partial: 'Some knowledge sources were unavailable',
  empty: 'No relevant saved knowledge found',
  unavailable: 'Saved knowledge search unavailable',
}

export function safeMissionUrl(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}

function readableTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function MissionDetail({ mission, busy, stale, onAction }: {
  mission: DeliveryMissionView; busy: boolean; stale: boolean; onAction: (request: DeliveryRequest) => void
}) {
  // Bind unsaved input to the actual question, not just a reused field ID.
  // Project resolution can replace the question set without changing specVersion.
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({})
  const answerKey = (question: DeliveryMissionView['questions'][number]) => JSON.stringify([mission.taskId, question.id, question.label])
  const answers = Object.fromEntries(mission.questions.map(question => [question.id, answerDrafts[answerKey(question)] ?? mission.answers[question.id] ?? '']))
  const preview = safeMissionUrl(mission.previewUrl)
  const disabled = busy || stale
  const connectionRetry = mission.stage === 'failed' && mission.nextAction.kind === 'connect' && mission.blockers.some(blocker => ['preparation_provider_authentication', 'preparation_provider_configuration'].includes(blocker.code))
  return <article className={styles.missionDetail} aria-label="Selected mission">
    <header className={styles.detailHeader}>
      <div><span className={styles.meta}>{mission.projectKey || 'Business to be confirmed'}</span><h2>{mission.title}</h2><p>{mission.summary || mission.objective}</p></div>
      <span className={styles.status} data-stage={mission.stage}>{MISSION_STAGE_LABELS[mission.stage]}</span>
    </header>
    <div className={styles.ownership}>
      <span>SPM assignment pending</span>
      {mission.buildOwner && <span>Build accepted by {mission.buildOwner.label} for branch and preview work</span>}
      <span>Updated {readableTime(mission.updatedAt)} AEST</span>
      {preview && <a className={styles.resultLink} href={preview} target="_blank" rel="noopener noreferrer">Open build result</a>}
    </div>
    <div className={styles.nextAction} role="status"><div className={styles.nextActionHeading}><strong>Next step</strong><span>Responsible: <b>{mission.nextAction.owner}</b></span></div><span>{mission.nextAction.label}</span></div>
    {mission.questions.length > 0 && mission.nextAction.kind === 'answer' && <form className={styles.questions} onSubmit={e => { e.preventDefault(); if (!disabled) onAction({ action: 'resume', taskId: mission.taskId, answers }) }}>
      <h3>A little business context</h3>
      {mission.questions.map(question => <div key={question.id} className={styles.answerField}>
        <label htmlFor={`mission-${mission.taskId}-${question.id}`}>{question.label}</label>
        <textarea id={`mission-${mission.taskId}-${question.id}`} value={answers[question.id] ?? ''} onChange={e => setAnswerDrafts(previous => ({ ...previous, [answerKey(question)]: e.target.value }))} disabled={disabled} maxLength={4000} required />
      </div>)}
      <button className={styles.primaryButton} disabled={disabled} type="submit">{busy ? 'Saving and continuing…' : 'Save answers and continue'}</button>
    </form>}
    {mission.spec && <section className={styles.reviewSpec} aria-label="Prepared specification">
      <h3>The result we are working towards</h3>
      <ul className={styles.requirements}>{mission.spec.requirements.map((item, i) => <li key={`${i}-${item}`}>{item}</li>)}</ul>
      <h3>How we will know it works</h3>
      <ul className={styles.checklist}>{mission.spec.acceptanceCriteria.map((item, i) => <li key={`${i}-${item}`}><span aria-hidden="true">□</span>{item}</li>)}</ul>
      <details className={styles.details}><summary>Delivery steps</summary><ol>{mission.spec.steps.map((step, i) => <li key={`${i}-${step}`}>{step}</li>)}</ol></details>
    </section>}
    {mission.nextAction.kind === 'approve' && mission.specVersion && <div className={styles.approval}>
      <div><h3>Does this capture your vision?</h3><p>Approval covers building this version in a branch and preparing a preview. Publishing to customers needs its own release authority.</p></div>
      <button className={styles.primaryButton} disabled={disabled} onClick={() => onAction({ action: 'approve', taskId: mission.taskId, specVersion: mission.specVersion! })}>{busy ? 'Recording your decision…' : 'Approve this build'}</button>
    </div>}
    {mission.nextAction.kind === 'resume' && <button className={styles.primaryButton} disabled={disabled} onClick={() => onAction({ action: 'resume', taskId: mission.taskId })}>{busy ? 'Continuing preparation…' : 'Continue with Margot'}</button>}
    {connectionRetry && <button className={styles.primaryButton} disabled={disabled} onClick={() => onAction({ action: 'resume', taskId: mission.taskId })}>{busy ? 'Continuing preparation…' : 'Continue after connection repair'}</button>}
    {mission.harness.length > 0 && <section className={styles.teamSection} aria-label="Recommended expertise"><h3>Expertise for this mission</h3><p className={styles.helper}>Recommended roles. An assignment is confirmed only when a worker accepts the mission.</p><div className={styles.roleList}>{mission.harness.map(role => <div className={styles.role} key={role.id}><strong>{role.label}</strong><span>{role.purpose}</span><small>Recommended</small></div>)}</div></section>}
    {mission.blockers.length > 0 && <section className={styles.blockers} aria-label="Delivery blockers"><h3>What still needs attention</h3><ul>{mission.blockers.map(blocker => <li key={blocker.code}>{blocker.message}</li>)}</ul></section>}
    {preview && ['review', 'release_blocked'].includes(mission.stage) && <MissionObservations taskId={mission.taskId} specVersion={mission.specVersion} />}
    <details className={styles.details}><summary>Sources and delivery evidence</summary>
      {mission.knowledgeContext && <section aria-label="Knowledge search coverage">
        <h3>{KNOWLEDGE_STATE_LABELS[mission.knowledgeContext.state]}</h3>
        <p>{mission.knowledgeContext.coverage}</p>
        <p className={styles.helper}>Checked <time dateTime={mission.knowledgeContext.observedAt}>{readableTime(mission.knowledgeContext.observedAt)} AEST</time></p>
      </section>}
      {mission.receipts.length === 0 && <p>No delivery receipts recorded yet.</p>}
      {mission.receipts.map((receipt, i) => { const url = safeMissionUrl(receipt.reference); return <p key={`${i}-${receipt.kind}`}>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{receipt.label}</a> : receipt.label}</p> })}
      {(mission.sourceRefs ?? []).map((source, i) => <p key={`${i}-${source.reference}`} className={styles.helper}>{source.label}</p>)}
      <p className={styles.helper}>A completed build or draft pull request does not establish a live, verified product.</p>
    </details>
  </article>
}
