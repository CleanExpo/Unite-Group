import React, { lazy, Suspense, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { FounderDesk } from '../src/app/(founder)/founder/command-centre/FounderDesk'
import { DELIVERY_PRESETS } from '../src/lib/command-centre/delivery-presets'
import type { DeliveryMissionView } from '../src/lib/command-centre/delivery-types'
import styles from '../src/app/(founder)/founder/command-centre/founder-desk.module.css'
import { MissionControlShell } from '../src/app/(founder)/founder/command-centre/MissionControlShell'
import { MISSION_CONTROL_HOME, MISSION_CONTROL_ALIASES, getMissionControlSection } from '../src/lib/navigation/mission-control'
import { ProvidersView } from '../src/app/(founder)/founder/command-centre/providers/ProvidersView'
import { KnowledgeView } from '../src/app/(founder)/founder/command-centre/knowledge/KnowledgeView'
import { SixZoneView } from '../src/app/(founder)/founder/command-centre/six-zone/SixZoneView'
import { CampaignsView } from '../src/components/founder/campaigns/CampaignsView'
import NewCampaignPage from '../src/app/(founder)/founder/campaigns/new/page'
import { CampaignDetailView } from '../src/components/founder/campaigns/CampaignDetailView'
import { BookkeeperView } from '../src/components/founder/bookkeeper/BookkeeperView'
import { FounderShell } from '../src/components/layout/FounderShell'
import { CommandPalette, CommandPaletteTrigger } from '../src/app/(founder)/founder/command-centre/CommandPalette'
import type { OperationsViewProps } from '../src/app/(founder)/founder/command-centre/operations/OperationsView'
import { WikiGraphView } from '../src/app/(founder)/founder/command-centre/wiki-graph/WikiGraphView'
import { OperatorGatewayView } from '../src/app/(founder)/founder/command-centre/operator-gateway/OperatorGatewayView'
import { HermesControlPanelView } from '../src/app/(founder)/founder/command-centre/hermes-control-panel/HermesControlPanelView'
import { StudioView } from '../src/app/(founder)/founder/command-centre/studio/StudioView'
import { getControlPanelView } from '../src/lib/operator-gateway/control-panel'
import Link from './link'
import { navigate, usePreviewLocation } from './navigation'
import { PreviewBoundary } from './PreviewBoundary'
import '../src/app/globals.css'
import './preview.css'

const sample: DeliveryMissionView = {
  taskId: '00000000-0000-4000-8000-000000000001', title: 'A clearer customer journey', objective: 'Let customers track their job and know what happens next.', projectKey: 'RestoreAssist', status: 'proposed', stage: 'ready_for_review', summary: 'A secure customer workspace for progress updates, quote decisions and the next appointment.', specVersion: 'a'.repeat(64),
  spec: { title: 'A clearer customer journey', summary: 'A customer workspace', requirements: ['Show each customer their job progress and the next expected update.', 'Let customers review a quote before work proceeds.', 'Keep every customer’s records private.'], acceptanceCriteria: ['A customer can sign in and see their own job.', 'A quote decision records the version the customer reviewed.', 'An unavailable source is clearly explained.'], steps: ['Confirm the existing job and customer records.', 'Build and check the customer journey.', 'Prepare a preview and independent review.'], presetIds: ['customer-portal', 'approvals'] },
  questions: [], answers: {}, harness: [{ id: 'spm', label: 'Senior project manager', purpose: 'Own the mission, dependencies and delivery evidence.', status: 'recommended', assignmentRef: null }, { id: 'design', label: 'Product designer', purpose: 'Make the customer journey clear and accessible.', status: 'recommended', assignmentRef: null }, { id: 'engineering', label: 'Senior engineer', purpose: 'Connect the interface to existing project records.', status: 'recommended', assignmentRef: null }, { id: 'review', label: 'Independent reviewer', purpose: 'Verify privacy and the complete customer journey.', status: 'recommended', assignmentRef: null }],
  owner: { label: 'SPM', status: 'required' }, nextAction: { kind: 'approve', owner: 'founder', label: 'Review the prepared brief and approve the build scope.' }, blockers: [{ code: 'spm', message: 'A delivery owner has not accepted this mission yet.' }], previewUrl: null, updatedAt: '2026-09-05T03:00:00Z', receipts: [], sourceRefs: [{ reference: 'sample', label: 'Design preview fixture — not connected to live business data.' }],
}
const sampleBoardMissions: DeliveryMissionView[] = [
  { verdict: 'HOLD', rationale: 'Confirm who owns customer data before building.', title: 'Sample HOLD · Customer data ownership', taskId: '00000000-0000-4000-8000-000000000004', specVersion: 'c'.repeat(64) },
  { verdict: 'REJECTED', rationale: 'Replace the unsupported release promise with an independently verified preview.', title: 'Sample REJECTED · Release evidence', taskId: '00000000-0000-4000-8000-000000000005', specVersion: 'd'.repeat(64) },
].map(({ verdict, rationale, title, taskId, specVersion }) => ({
  ...sample, taskId, title, specVersion, projectKey: 'Unite-Group',
  summary: `Local sample showing a ${verdict} Board review. No live Board decision or business action is connected.`,
  nextAction: { kind: 'approve', owner: 'You', label: 'Review Board concerns before deciding on a branch build' },
  blockers: [{ code: 'board_concern', message: `Board ${verdict}: ${rationale}` }, ...sample.blockers],
  sourceRefs: [{ reference: `sample-board-${verdict.toLowerCase()}`, label: `Sample Board ${verdict} for local UI testing — not a live Board review.` }],
}))
const missions: DeliveryMissionView[] = [sample, { ...sample, taskId: '00000000-0000-4000-8000-000000000002', title: 'Campaign performance in one place', projectKey: 'Synthex', stage: 'needs_clarification', questions: [{ id: 'audience', label: 'Which campaign would you like to start with?' }], spec: null, nextAction: { kind: 'answer', owner: 'founder', label: 'Choose the first campaign to include.' } }, { ...sample, taskId: '00000000-0000-4000-8000-000000000003', title: 'Internal reporting workspace', projectKey: 'CARSI', stage: 'review', previewUrl: 'https://github.com/example/product/pull/1', nextAction: { kind: 'wait', owner: 'reviewer', label: 'Independent review and live verification are still required.' } }, ...sampleBoardMissions]

const originalFetch = window.fetch.bind(window)
window.fetch = async (_input, init) => {
  const url = new URL(_input instanceof Request ? _input.url : String(_input), window.location.href)
  if (url.pathname === '/api/command-centre/missions/repositories') return originalFetch(_input, init)
  if (!['/api/command-centre/missions', '/api/command-centre/missions/observations'].includes(url.pathname)) {
    if (url.pathname.startsWith('/api/')) return Response.json({ error: 'This authenticated service is unavailable in the local preview. No live data or actions are connected here.', source: 'not_connected', status: 'unavailable' }, { status: 503 })
    return originalFetch(_input, init)
  }
  await new Promise(resolve => setTimeout(resolve, 300))
  if (init?.method !== 'POST') return Response.json({ missions, presets: DELIVERY_PRESETS, source: 'supabase' })
  const request = JSON.parse(String(init.body))
  if (String(_input).endsWith('/observations')) return Response.json({ taskId: request.taskId, specVersion: sample.specVersion, specRevision: 1, source: 'github', observedAt: '2026-09-05T03:00:00Z', state: 'partial', headSha: 'b'.repeat(40), pr: null,
    checks: { state: 'observed', items: [{ receiptId: 'sample-check', name: 'Build', status: 'completed', conclusion: 'success' }] },
    statuses: { state: 'partial', detail: 'Sample incomplete coverage — this is not a live provider read.', items: [{ receiptId: 'sample-status', context: 'Security review', state: 'failure' }] },
    reviews: { state: 'observed', items: [] }, deployments: { state: 'observed', items: [] }, limitations: ['Design preview sample data.'], liveVerification: 'not_connected' })
  const existing = missions.find(m => m.taskId === request.taskId)
  if (request.action === 'prepare') {
    const next = { ...sample, taskId: request.clientRequestId, title: request.idea.slice(0, 65), objective: request.idea, projectKey: request.projectKey || null }
    missions.unshift(next)
    return Response.json({ mission: next, deduplicated: false })
  }
  if (existing) {
    if (request.action === 'approve') { existing.stage = 'queued'; existing.nextAction = { kind: 'wait', owner: 'SPM', label: 'Build approved. Waiting for an assigned delivery worker.' } }
    else { existing.stage = 'ready_for_review'; existing.questions = []; existing.spec = sample.spec; existing.answers = request.answers ?? {}; existing.nextAction = sample.nextAction }
    return Response.json({ mission: existing, deduplicated: false })
  }
  return Response.json({ error: 'Sample mission unavailable' }, { status: 404 })
}

const entryAliases = new Set<string>(MISSION_CONTROL_ALIASES)
const OperationsView = lazy(() => import('../src/app/(founder)/founder/command-centre/operations/OperationsView').then(module => ({ default: module.OperationsView })))
const PortfolioView = lazy(() => import('../src/app/(founder)/founder/command-centre/portfolio/PortfolioView').then(module => ({ default: module.PortfolioView })))
const unavailable = 'Authenticated source unavailable in the local preview.'
const operationsUnavailable: OperationsViewProps = {
  serverDataUnavailable: unavailable,
  dashboard: { dashboard_dir: 'Unavailable', scanned_at: '', entries: [], red_count: 0, amber_count: 0, green_count: 0, error_count: 0 },
  evidence: { ledger_path: 'Unavailable', scanned_at: '', total_lines: 0, parsed_lines: 0, malformed_lines: 0, entries: [] },
  actionQueue: { queue_path: 'Unavailable', scanned_at: '', total_rows: 0, shown_rows: 0, rows: [], headers: [], read_error: unavailable },
  blockedLanes: { backlog_path: 'Unavailable', scanned_at: '', total_lanes: 0, blocked_count: 0, rows: [], read_error: unavailable },
  agentEventsWall: { events: [], source: 'not_connected', reason: 'no_founder', error: unavailable },
}
function Preview() {
  const location = usePreviewLocation()
  useEffect(() => { window.dispatchEvent(new Event('mission-preview:ready')) }, [])
  const pathname = window.location.pathname.replace(/\/$/, '') || '/'
  const section = getMissionControlSection(pathname)
  useEffect(() => { if (entryAliases.has(pathname)) navigate(MISSION_CONTROL_HOME + window.location.search + window.location.hash, true) }, [location, pathname])
  let content: React.ReactNode
  if (section === 'home') content = <MissionControlShell section="home" actions={<CommandPaletteTrigger />}><CommandPalette projects={[]} tools={[]} /><FounderDesk projects={[]} /></MissionControlShell>
  else if (section === 'operations') content = <OperationsView {...operationsUnavailable} />
  else if (section === 'portfolio') content = <PortfolioView projects={[]} integrationStatuses={[]} registryUnavailable={unavailable} integrationStatus={<p>{unavailable}</p>} pipeline={{ opportunities: [], source: 'degraded', error: unavailable, totalFetched: 0, excludedCount: 0 }} />
  else if (section === 'providers') content = <ProvidersView />
  else if (section === 'knowledge') content = <KnowledgeView tools={[]} catalogueUnavailable />
  else if (section === 'six-zone') content = <SixZoneView work={{ queued: 0, blocked: 0, source: 'Unavailable in local preview', nextAction: null, error: true }} />
  else if (section === 'campaigns') content = pathname === '/founder/campaigns' ? <CampaignsView campaigns={null} /> : pathname === '/founder/campaigns/new' ? <NewCampaignPage /> : <CampaignDetailView id={decodeURIComponent(pathname.split('/').at(-1)!)} />
  else if (section === 'finance') content = <BookkeeperView />
  else if (section === 'wiki-graph') content = <WikiGraphView graph={null} error truncated={false} />
  else if (section === 'operator-gateway') content = <OperatorGatewayView view={null} jobEvents={[]} agentConnection={null} />
  else if (section === 'hermes-control-panel') content = <HermesControlPanelView view={getControlPanelView()} />
  else if (section === 'studio') content = <StudioView taskId={new URLSearchParams(window.location.search).get('taskId') ?? undefined} />
  else content = <div className={styles.shell}><h1>404 · Workspace not found</h1><p>This address does not match a Mission Control workspace.</p><Link href={MISSION_CONTROL_HOME}>Return to Mission Control</Link></div>
  return <div className="previewRoot"><div className="previewBanner"><strong>Local design preview · sample missions</strong><span>GitHub repository names are real. Authenticated business data is unavailable here; no real work is submitted.</span></div><FounderShell user={{ name: 'Local preview', email: 'No authenticated account in this preview' }}><Suspense fallback={<p>Loading workspace…</p>}>{content}</Suspense></FounderShell></div>
}
createRoot(document.getElementById('root')!).render(<PreviewBoundary><Preview /></PreviewBoundary>)
