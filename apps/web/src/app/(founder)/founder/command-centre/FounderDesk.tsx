'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { BUSINESSES, getBusinessByKey } from '@/lib/businesses'
import type { DeliveryMissionView, DeliveryPreset, DeliveryRequest } from '@/lib/command-centre/delivery-types'
import { MargotMissionConsole } from './MargotMissionConsole'
import { MissionDetail, MISSION_STAGE_LABELS } from './MissionDetail'
import { IdeaCapture } from './MissionLifecycle'
import styles from './founder-desk.module.css'

interface MissionResponse { mission?: DeliveryMissionView; error?: string }
interface MissionListResponse { missions?: DeliveryMissionView[]; presets?: DeliveryPreset[]; source?: string; error?: string }

function saveSelectedMission(id: string | null) {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set('mission', id)
  else url.searchParams.delete('mission')
  window.history.replaceState(window.history.state, '', url)
}

export function FounderDesk({ projects }: { projects: Array<{ name: string }> }) {
  const [missions, setMissions] = useState<DeliveryMissionView[]>([])
  const [businessFilter, setBusinessFilter] = useState('')
  const [presets, setPresets] = useState<DeliveryPreset[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedMission = useRef<string | null>(null)
  const [draftKey, setDraftKey] = useState(0)
  const [view, setView] = useState<'desk' | 'operations'>('desk')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [readError, setReadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const interaction = useRef(0)
  const readSequence = useRef(0)
  const mutationInFlight = useRef(false)
  const retryIdentity = useRef<{ input: string; id: string } | null>(null)

  const load = useCallback(async () => {
    if (mutationInFlight.current) return
    setLoading(true)
    const sequence = ++readSequence.current
    try {
      const response = await fetch('/api/command-centre/missions', { credentials: 'include', cache: 'no-store' })
      const data = await response.json() as MissionListResponse
      if (sequence !== readSequence.current) return
      if (!response.ok || data.source !== 'supabase' || !Array.isArray(data.missions) || !Array.isArray(data.presets)) throw new Error(data.error || 'Mission history could not be loaded. Try refreshing it.')
      setMissions(data.missions)
      setPresets(data.presets)
      setReadError(null)
    } catch (error) {
      if (sequence === readSequence.current) setReadError(error instanceof Error ? error.message : 'Mission history could not be loaded. Try refreshing it.')
    } finally {
      if (sequence === readSequence.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const params = new URL(window.location.href).searchParams
    const business = params.get('business') ?? ''
    setBusinessFilter(getBusinessByKey(business) ? business : '')
    selectedMission.current = params.get('mission')
    setSelectedId(selectedMission.current)
    void load()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load() }, 20000)
    return () => { window.clearInterval(timer); readSequence.current++; interaction.current++ }
  }, [load])

  const newIdea = useCallback(() => {
    interaction.current++
    mutationInFlight.current = false
    setSelectedId(null)
    selectedMission.current = null
    setView('desk')
    setDraftKey(key => key + 1)
    setBusy(false)
    setActionError(null)
    retryIdentity.current = null
    saveSelectedMission(null)
  }, [])

  useEffect(() => {
    const focusComposer = () => { if (!mutationInFlight.current) { setView('desk'); setSelectedId(null); selectedMission.current = null; saveSelectedMission(null) } }
    window.addEventListener('mission:focus-idea', focusComposer)
    return () => window.removeEventListener('mission:focus-idea', focusComposer)
  }, [])

  function selectMission(id: string) {
    interaction.current++
    mutationInFlight.current = false
    setSelectedId(id)
    selectedMission.current = id
    setBusy(false)
    setActionError(null)
    saveSelectedMission(id)
  }

  async function act(request: DeliveryRequest) {
    if (mutationInFlight.current) return
    const current = ++interaction.current
    readSequence.current++
    mutationInFlight.current = true
    setBusy(true)
    setActionError(null)
    try {
      const response = await fetch('/api/command-centre/missions', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request),
      })
      const data = await response.json() as MissionResponse
      if (current !== interaction.current) return
      if (data.mission?.taskId) {
        setMissions(previous => [data.mission!, ...previous.filter(m => m.taskId !== data.mission!.taskId)])
        setSelectedId(data.mission.taskId)
        selectedMission.current = data.mission.taskId
        saveSelectedMission(data.mission.taskId)
      }
      // This saved failure has its own operator-owned inline action. Do not
      // leave a duplicate global error behind after a read-only recovery check.
      if (!response.ok && data.mission?.nextAction.kind === 'connect' && data.mission.blockers.some(blocker => blocker.code === 'approval_signing_unavailable')) return
      if (!response.ok || !data.mission?.taskId) throw new Error(data.error || 'The mission was not confirmed. Your idea is retained so you can try again.')
    } catch (error) {
      if (current === interaction.current) setActionError(error instanceof Error ? error.message : 'The connection was interrupted. Try again to confirm this mission.')
    } finally {
      if (current === interaction.current) { mutationInFlight.current = false; setBusy(false); setLoading(false) }
    }
  }

  function prepare(idea: string, projectKey: string, presetIds: string[]) {
    const input = JSON.stringify({ idea, projectKey, presetIds: [...presetIds].sort() })
    if (retryIdentity.current?.input !== input) retryIdentity.current = { input, id: crypto.randomUUID() }
    void act({ action: 'prepare', clientRequestId: retryIdentity.current.id, idea, ...(projectKey ? { projectKey } : {}), presetIds })
  }

  function captured(mission: DeliveryMissionView) {
    readSequence.current++
    setLoading(false)
    setMissions(previous => [mission, ...previous.filter(item => item.taskId !== mission.taskId)])
    if (selectedMission.current !== null) return
    setSelectedId(mission.taskId)
    selectedMission.current = mission.taskId
    saveSelectedMission(mission.taskId)
  }

  const visibleMissions = businessFilter ? missions.filter(mission => mission.businessKey === businessFilter).sort((left, right) => (left.priority ?? 'P2').localeCompare(right.priority ?? 'P2') || Date.parse(left.createdAt ?? left.updatedAt) - Date.parse(right.createdAt ?? right.updatedAt)) : missions
  const selected = missions.find(m => m.taskId === selectedId)
  useEffect(() => {
    // A confirmed refile keeps the open mission and follows its saved business.
    if (!businessFilter || !selected || selected.businessKey === businessFilter) return
    const nextBusiness = selected.businessKey ?? ''
    setBusinessFilter(nextBusiness)
    const url = new URL(window.location.href)
    if (nextBusiness) url.searchParams.set('business', nextBusiness)
    else url.searchParams.delete('business')
    window.history.replaceState(window.history.state, '', url)
  }, [businessFilter, selected])

  function missionCard(mission: DeliveryMissionView) {
    return <button key={mission.taskId} disabled={busy && mission.taskId === selectedId} className={styles.missionCard} data-selected={mission.taskId === selectedId} aria-pressed={mission.taskId === selectedId} onClick={() => selectMission(mission.taskId)}>
      <span className={styles.missionProject}>{getBusinessByKey(mission.businessKey ?? '')?.name || 'Unassigned business'}</span>
      <strong>{mission.title}</strong>
      {mission.priority && <span className={styles.helper}>Priority {mission.priority}</span>}
      <span className={styles.status} data-stage={mission.stage}>{MISSION_STAGE_LABELS[mission.stage]}</span>
      <span className={styles.missionNext}>{mission.nextAction.label}</span>
    </button>
  }
  return <div className={styles.founderDesk}>
    <header className={styles.deskHeader}>
      <div><h1>Your vision. A clear path forward.</h1><p>Turn ideas into missions. See progress. Make the decisions that need you.</p></div>
      <button className={styles.secondaryButton} onClick={newIdea}>New idea</button>
    </header>
    <div className={styles.answerField}><label htmlFor="mission-business-filter">Show missions for</label><select id="mission-business-filter" value={businessFilter} disabled={busy} onChange={event => { if (event.target.value && selected?.businessKey !== event.target.value) { setSelectedId(null); selectedMission.current = null; saveSelectedMission(null) } setBusinessFilter(event.target.value); const url = new URL(window.location.href); if (event.target.value) url.searchParams.set('business', event.target.value); else url.searchParams.delete('business'); window.history.replaceState(window.history.state, '', url) }}><option value="">All businesses</option>{BUSINESSES.map(business => <option key={business.key} value={business.key}>{business.name}</option>)}</select></div>
    {businessFilter && <p className={styles.helper}>Showing {getBusinessByKey(businessFilter)?.name} missions by urgency, oldest first within each priority, from the latest 100 founder tasks. <a href={`/founder/${businessFilter}`}>Open business</a></p>}
    {actionError && <div className={styles.error} role="alert">{actionError}</div>}
    <div hidden={!!selectedId || view !== 'desk'}>
      <IdeaCapture key={`capture-${draftKey}`} onCaptured={captured} />
      <details className={styles.details}><summary>Existing delivery preparation</summary><p className={styles.helper}>For work already ready for specification preparation. This uses the existing connected AI preparation service and its allowance. Capturing an idea above saves it for research only.</p><MargotMissionConsole key={draftKey} projects={projects} presets={presets} busy={busy} onPrepare={prepare} /></details>
    </div>
    {selectedId && !selected && <div className={styles.empty}>{loading ? 'Loading your mission…' : 'This mission is unavailable in the current history. Refresh the list or start a new idea.'}</div>}
    <div className={styles.viewSwitch} role="group" aria-label="Mission view">
      <button aria-pressed={view === 'desk'} onClick={() => setView('desk')}>Founder desk</button>
      <button aria-pressed={view === 'operations'} onClick={() => setView('operations')}>Operations floor</button>
    </div>
    {view === 'operations' && <section className={styles.floor} aria-label="Mission operations floor">
      <div className={styles.sectionHeading}><h2>One mission, through every stage</h2><button className={styles.textButton} disabled={busy} onClick={() => void load()}>Refresh</button></div>
      <p className={styles.helper}>The same saved missions, arranged by delivery stage. Assignments and evidence stay with each mission.</p>
      {readError && <div className={styles.error} role="alert">{readError} Previous results may be out of date.</div>}
      {loading && missions.length === 0 ? <p className={styles.empty}>Loading mission history…</p> : <div className={styles.floorGrid}>{[
        { title: 'Preparing', stages: ['captured', 'needs_clarification', 'preparing', 'ready_for_review', 'failed'] },
        { title: 'Building', stages: ['queued', 'building'] },
        { title: 'Review & release', stages: ['review', 'release_blocked'] },
      ].map(lane => { const items = visibleMissions.filter(m => lane.stages.includes(m.stage)); return <section key={lane.title} className={styles.floorLane} aria-label={lane.title}><h3>{lane.title} <span>{readError ? '—' : items.length}</span></h3>{items.map(missionCard)}{!items.length && !readError && <p className={styles.helper}>No missions at this stage.</p>}</section> })}</div>}
      {selected && <MissionDetail key={`${selected.taskId}:${selected.specVersion ?? 'draft'}`} mission={selected} busy={busy} stale={!!readError} refreshing={loading} onRefresh={() => void load()} onAction={request => void act(request)} />}
    </section>}
    {view === 'desk' && <section className={styles.missionWorkspace} data-selected={!!selected} aria-label="Your missions">
      <div className={styles.missionList}>
        <div className={styles.sectionHeading}><h2>Your missions</h2><button className={styles.textButton} disabled={busy} onClick={() => void load()}>Refresh</button></div>
        {readError && <div className={styles.error} role="alert">{readError}{missions.length > 0 && <p>Showing the last successful read. Refresh before making a decision.</p>}</div>}
        {loading && missions.length === 0 && <p className={styles.helper}>Loading mission history…</p>}
        {!loading && !readError && missions.length === 0 && <p className={styles.empty}>Your next idea starts here. Once captured, its progress and decisions stay with the mission.</p>}
        {visibleMissions.map(missionCard)}
        {!loading && !readError && businessFilter && visibleMissions.length === 0 && <p className={styles.helper}>No missions filed under this business in the current history.</p>}
        <Link href="/founder/command-centre/operations#task-queue" className={styles.helper}>Open all existing tasks and approvals</Link>
      </div>
      {selected && <MissionDetail key={`${selected.taskId}:${selected.specVersion ?? 'draft'}`} mission={selected} busy={busy} stale={!!readError} refreshing={loading} onRefresh={() => void load()} onAction={request => void act(request)} />}
    </section>}
  </div>
}
