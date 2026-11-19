import type { Metadata } from 'next'

import { noIndexPageMetadata } from '@/lib/page-metadata'
import { formatAuDate } from '@/lib/portal/projects/forecast'
import { portalProjectsContext } from '@/lib/portal/projects/server'
import { loadProjectView, ROW_CAP, type ProjectItem, type ProjectView } from '@/lib/portal/projects/service'
import { authorLabel, STATE_LABEL, type StateGroup } from '@/lib/portal/projects/state'

import { AccessPanel } from '../changes/access-panel'

import s from './project.module.css'
import { RequestForm } from './request-form'
import { RespondControl } from './respond-control'

// Client project page: what we are building, what is waiting on you, what is blocked, what changed this week, and
// when the next result is expected. Every figure comes from the client's own rows (row rules, aal2). No percentages,
// no invented dates: a missing estimate reads ESTIMATE NOT YET VERIFIED. A held release is shown as held, not failed.

export const dynamic = 'force-dynamic'

export const metadata: Metadata = noIndexPageMetadata({
  path: '/portal/project',
  title: 'Your project | Unite Group',
  description: 'Project progress, decisions waiting on you, and requests.',
})

const HEALTH_LABEL = { on_track: 'On track', at_risk: 'At risk', blocked: 'Blocked', on_hold: 'On hold', unknown: 'Not yet assessed' } as const
const GROUP_ORDER: { group: StateGroup; title: string }[] = [
  { group: 'received', title: 'Received, not yet scoped' },
  { group: 'in_progress', title: 'In progress' },
  { group: 'accepted_awaiting_release', title: 'Accepted by you, waiting for release' },
  { group: 'released', title: 'Released' },
]

export default async function PortalProjectPage() {
  const { access, db } = await portalProjectsContext()
  return (
    <main id="main" className={s.page}>
      <div className={s.wrap}>
        {access.kind !== 'ok'
          ? <AccessPanel access={access} returnTo="/portal/project" />
          : <ProjectBody result={await loadProjectView(access, db)} />}
      </div>
    </main>
  )
}

function ProjectBody({ result }: { result: Awaited<ReturnType<typeof loadProjectView>> }) {
  if (!result.ok) return <p role="alert" className={s.err}>{result.message}</p>
  if (!result.view) {
    return (
      <section className={s.card}>
        <h1 className={s.title}>Your project</h1>
        <p className={s.lede}>We have not set up a project page for you yet. Your Unite-Group contact will let you know when it is ready.</p>
      </section>
    )
  }
  return <ProjectPage view={result.view} />
}

function ProjectPage({ view }: { view: ProjectView }) {
  const { project } = view
  return (
    <>
      <header className={s.head}>
        <p className={s.eyebrow}>Your project</p>
        <h1 className={s.title}>{project.name}</h1>
        {project.objective && <p className={s.lede}>{project.objective}</p>}
        <dl className={s.facts}>
          <div><dt>Project health</dt><dd className={s[`health_${project.health}`]}>{HEALTH_LABEL[project.health]}</dd></div>
          <div><dt>Current milestone</dt><dd>{project.currentMilestone ?? 'Not set'}</dd></div>
          <div><dt>Next delivery</dt><dd>{view.nextForecast ? <Forecast item={view.nextForecast} /> : 'ESTIMATE NOT YET VERIFIED'}</dd></div>
          <div><dt>Last updated</dt><dd>{formatAuDate(project.updatedAt)}</dd></div>
        </dl>
        {project.healthReason && <p className={s.hint}>{project.healthReason}</p>}
        {project.productionHold && (
          <p className={s.hold} role="note">
            <strong>Release on hold.</strong> {project.holdReason} Work can still be built and tested; nothing goes live until the hold is lifted.
          </p>
        )}
      </header>

      <Section title="Needs your decision" empty="Nothing is waiting on you right now." items={view.waitingOnYou} respond />
      <Section title="Current blockers" empty="No blockers." items={view.blockers} />
      <Section title="What changed this week" empty="No changes in the last 7 days." items={view.changedThisWeek} />

      <section className={s.card} aria-labelledby="new-request">
        <h2 id="new-request" className={s.h2}>Send a new request</h2>
        <RequestForm projectSlug={project.slug} />
      </section>

      {view.truncated && (
        <p className={s.hold} role="note">
          This project has more than {ROW_CAP} items. Only the {ROW_CAP} most recently updated are shown below; older items are not shown.
        </p>
      )}

      {GROUP_ORDER.map(({ group, title }) => (
        <Section key={group} title={title} empty="None." items={view.items.filter((i) => i.group === group)} />
      ))}
    </>
  )
}

function Section({ title, empty, items, respond = false }: { title: string; empty: string; items: ProjectItem[]; respond?: boolean }) {
  return (
    <section className={s.card} aria-label={title}>
      <h2 className={s.h2}>{title} <span className={s.count}>{items.length}</span></h2>
      {items.length === 0 ? <p className={s.hint}>{empty}</p> : (
        <ul className={s.list}>
          {items.map((item) => (
            <li key={item.id} className={s.item}>
              <div className={s.itemHead}>
                <span className={s.itemTitle}>{item.title}</span>
                <span className={s.badge} data-group={item.group}>{STATE_LABEL[item.state]}</span>
              </div>
              <ItemContext item={item} />
              {item.plainSummary && (
                <p className={s.summary}>{item.plainSummary}{item.summaryIsAiProposal && <em className={s.ai}> (AI summary, not yet confirmed)</em>}</p>
              )}
              {item.decisionNeeded && <p className={s.summary}><strong>Decision needed:</strong> {item.decisionNeeded}</p>}
              {item.blockerReason && <p className={s.summary}><strong>Blocked by:</strong> {item.blockerReason}</p>}
              <p className={s.meta}>
                From: {authorLabel(item.authorKind)} – Updated {formatAuDate(item.updatedAt)} – Expected: <Forecast item={item} />
                {item.evidenceCount > 0 && <> – {item.evidenceCount} evidence record{item.evidenceCount === 1 ? '' : 's'}</>}
              </p>
              {respond && <RespondControl itemId={item.id} currentState={item.state} waitingOn={item.waitingOn} actions={item.actions} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// The one place that decides what context a card carries. Every card renders it, in every section, so no section
// can show a decision without the words it is about. The title is only the first line of client_text, cut at 200
// characters (portal_submit_project_request), so the full original text is shown whenever it says more.
function ItemContext({ item }: { item: ProjectItem }) {
  const original = item.clientText?.trim()
  return (
    <>
      {original && original !== item.title.trim() && (
        <p className={`${s.summary} ${s.original}`}><strong>Original request:</strong> {original}</p>
      )}
      {item.clientNote && <p className={`${s.summary} ${s.original}`}><strong>Your last note:</strong> {item.clientNote}</p>}
    </>
  )
}

function Forecast({ item }: { item: ProjectItem }) {
  const f = item.forecast
  if (f.kind === 'unverified') return <span className={s.unverified}>{f.text}</span>
  return (
    <span title={`Basis: ${f.basis}`}>
      {f.text} ({f.confidence} confidence, set {formatAuDate(f.updatedAt)}{f.stale ? ', may be out of date' : ''})
    </span>
  )
}
