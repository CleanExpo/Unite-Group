'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ADD_ON_GATES,
  CONTROL_WORKSTREAMS,
  type AddOnGate,
  type ControlRyg,
  type ControlStatus,
  type ControlWorkstream,
} from './control-panel-data'
import { mapAddOnResult, type AddOnOutcome } from './add-on-result'
import styles from '../command-centre.module.css'
import { SourceBadge } from '../SourceBadge'
import { DegradedDataBanner } from '../DegradedDataBanner'
import { DeckDetails } from '../DeckDetails'

type LiveControlWorkstream = ControlWorkstream & {
  ccTaskId?: string
  ccTaskStatus?: string
  lastUpdated?: string
}

type ControlPanelPayload = {
  source: string
  taskCount: number
  generatedAt: string
  summary: Record<ControlRyg, number> & { approvalRequired?: number }
  workstreams: LiveControlWorkstream[]
  addOns: AddOnGate[]
}

const STATUS_LABELS: Record<ControlStatus, string> = {
  live: 'live',
  building: 'building',
  gated: 'gated',
  planned: 'planned',
}

const RYG_LABELS: Record<ControlRyg, string> = {
  green: 'GREEN',
  yellow: 'YELLOW',
  red: 'RED',
}

// Fill/border variant — bright signal, used for dots, LEDs and borders.
function statusColor(status: ControlStatus, ryg?: ControlRyg) {
  if (ryg === 'red' || status === 'gated') return 'var(--cc-signal)'
  if (status === 'live') return 'var(--cc-ink)'
  if (status === 'building') return 'var(--cc-ink-dim)'
  return 'var(--cc-ink-hush)'
}

// Text variant — AA-safe darkened signal, used wherever the status colour
// paints text content.
function statusTextColor(status: ControlStatus, ryg?: ControlRyg) {
  if (ryg === 'red' || status === 'gated') return 'var(--cc-signal-text)'
  if (status === 'live') return 'var(--cc-ink)'
  if (status === 'building') return 'var(--cc-ink-dim)'
  return 'var(--cc-ink-hush)'
}

function stateLabel(status: ControlStatus, ryg?: ControlRyg) {
  if (ryg) return `${RYG_LABELS[ryg]} / ${STATUS_LABELS[status]}`
  return STATUS_LABELS[status]
}

type HermesControlPanelProps = {
  initialPayload?: ControlPanelPayload
}

export function HermesControlPanel({ initialPayload }: HermesControlPanelProps = {}) {
  const [payload, setPayload] = useState<ControlPanelPayload | null>(initialPayload ?? null)
  const [sourceState, setSourceState] = useState<'loading' | 'live' | 'fallback'>(
    initialPayload?.source.startsWith('cc:') ? 'live' : initialPayload ? 'fallback' : 'loading',
  )
  const [fallbackReason, setFallbackReason] = useState<string | null>(
    initialPayload && !initialPayload.source.startsWith('cc:')
      ? `server returned source=${initialPayload.source}`
      : null,
  )
  const [localAddOns, setLocalAddOns] = useState<AddOnGate[] | null>(initialPayload?.addOns ?? null)
  const [pendingAddOnId, setPendingAddOnId] = useState<string | null>(null)
  const [addOnOutcome, setAddOnOutcome] = useState<AddOnOutcome | null>(null)
  const [activeWorkstreamId, setActiveWorkstreamId] = useState<string>(CONTROL_WORKSTREAMS[0]?.id ?? '')

  useEffect(() => {
    if (initialPayload) return

    let cancelled = false

    async function loadControlPanel() {
      try {
        const res = await fetch('/api/command-centre/control-panel', { cache: 'no-store' })
        if (!res.ok) throw new Error(`control_panel_http_${res.status}`)
        const body = (await res.json()) as ControlPanelPayload
        if (cancelled) return
        setPayload(body)
        setLocalAddOns(body.addOns)
        if (body.source.startsWith('cc:')) {
          setSourceState('live')
          setFallbackReason(null)
        } else {
          setSourceState('fallback')
          setFallbackReason(`server returned source=${body.source}`)
        }
      } catch (err) {
        if (cancelled) return
        setPayload(null)
        setSourceState('fallback')
        setFallbackReason(err instanceof Error ? err.message : 'control_panel_fetch_failed')
      }
    }

    void loadControlPanel()

    return () => {
      cancelled = true
    }
  }, [initialPayload])

  async function requestAddOnGate(addOn: AddOnGate) {
    setPendingAddOnId(addOn.id)
    setAddOnOutcome(null)

    let status: number | null = null
    let body: unknown = null
    try {
      const res = await fetch('/api/command-centre/control-panel/add-ons', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ addOnId: addOn.id }),
      })
      status = res.status
      body = await res.json().catch(() => null)
    } catch {
      // fetch() threw — status stays null → taxonomy classifies as network.
    }

    const outcome = mapAddOnResult(status, body, addOn.label)
    setAddOnOutcome(outcome)
    if (outcome.ok && outcome.ccTaskId) {
      setLocalAddOns((current) =>
        (current ?? payload?.addOns ?? ADD_ON_GATES).map((item) =>
          item.id === addOn.id
            ? { ...item, state: 'gated', ccTaskId: outcome.ccTaskId, ccTaskStatus: outcome.ccTaskStatus }
            : item,
        ),
      )
    }
    setPendingAddOnId(null)
  }

  const workstreams = payload?.workstreams ?? CONTROL_WORKSTREAMS
  const addOns = localAddOns ?? payload?.addOns ?? ADD_ON_GATES
  const green = payload?.summary.green ?? workstreams.filter((item) => item.ryg === 'green').length
  const yellow = payload?.summary.yellow ?? workstreams.filter((item) => item.ryg === 'yellow').length
  const red = payload?.summary.red ?? workstreams.filter((item) => item.ryg === 'red').length
  const approvalRequired = payload?.summary.approvalRequired ?? 0
  const badgeMode = sourceState === 'live' ? 'live' : sourceState === 'loading' ? 'loading' : 'degraded'
  const badgeLabel =
    sourceState === 'live'
      ? `CC · ${payload?.taskCount ?? 0} tasks`
      : sourceState === 'loading'
        ? 'CC · requesting'
        : 'CC unreachable · seed plan'
  const activeWorkstream = workstreams.find((item) => item.id === activeWorkstreamId) ?? workstreams[0]

  // Founder feedback 14/07/2026 — when the command-centre substrate is
  // unreachable this panel renders the illustrative seed plan (inert
  // scaffolding, per control-panel-data.ts), so the whole console collapses
  // to a single summary line behind the shared DeckDetails disclosure. It
  // opens by default only when live cc: data is driving it. Panel logic and
  // content are unchanged inside the disclosure; the panel already uses the
  // deck's --cc-* token vocabulary (mapped onto --deck-* in
  // command-deck.module.css), so no off-system colours needed removing here.
  const summaryStats =
    sourceState === 'live'
      ? `${green} green · ${yellow} yellow · ${red} red · ${approvalRequired} approval${approvalRequired === 1 ? '' : 's'} required`
      : sourceState === 'loading'
        ? 'requesting command-centre state…'
        : 'not connected — showing the seed plan'

  return (
    <DeckDetails
      title="Hermes control panel"
      stats={summaryStats}
      badge={<SourceBadge mode={badgeMode} label={badgeLabel} lastUpdatedAt={payload?.generatedAt} />}
      defaultOpen={sourceState === 'live'}
      testId="hermes-control-panel-disclosure"
    >
    <section
      className="flex min-h-168 flex-col"
      style={{ background: 'var(--cc-bg-soft)', borderTop: '1px solid var(--cc-grid)' }}
      aria-label="CEO Control Panel"
    >
      <header
        className="flex flex-col gap-3 px-6 py-5 lg:flex-row lg:items-end lg:justify-between"
        style={{ background: 'var(--cc-bg)', borderBottom: '1px solid var(--cc-grid)' }}
      >
        <div className="flex flex-col gap-2">
          <span
            className="font-mono text-[11px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--cc-ink-dim)' }}
          >
            CEO Control Panel
          </span>
          <h2 className="text-xl font-semibold leading-tight" style={{ color: 'var(--cc-ink)' }}>
            Command-centre operating spine
          </h2>
          <SourceBadge mode={badgeMode} label={badgeLabel} lastUpdatedAt={payload?.generatedAt} />
          {/* UNI-2341: forward links to the two sub-consoles that were orphaned
              (working routes, zero inbound links anywhere in the app). */}
          <span className="flex flex-wrap gap-3 font-mono text-[11px]" style={{ color: 'var(--cc-ink-dim)' }}>
            <Link
              href="/founder/command-centre/hermes-control-panel"
              style={{ color: 'var(--cc-ink-dim)', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Modules &amp; security ↗
            </Link>
            <Link
              href="/founder/command-centre/operator-gateway"
              style={{ color: 'var(--cc-ink-dim)', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Operator gateway ↗
            </Link>
          </span>
        </div>

        <div
          className="grid grid-cols-2 gap-px overflow-hidden border sm:grid-cols-4"
          style={{ borderColor: 'var(--cc-grid)', background: 'var(--cc-grid)' }}
          aria-label="Portfolio RYG and approval summary"
        >
          <SummaryCell label="GREEN" value={green} tone="green" />
          <SummaryCell label="YELLOW" value={yellow} tone="yellow" />
          <SummaryCell label="RED" value={red} tone="red" />
          <SummaryCell label="APPROVAL REQUIRED" value={approvalRequired} tone="red" />
        </div>
      </header>

      {sourceState === 'fallback' && (
        <DegradedDataBanner source="Command centre" reason={fallbackReason ?? undefined} />
      )}

      <div
        className="grid grid-cols-1 lg:grid-cols-[18rem_1fr]"
        style={{ gap: 1, background: 'var(--cc-grid)' }}
      >
        <aside
          className="flex flex-col"
          style={{ background: 'var(--cc-bg)' }}
          aria-label="Mission Control navigation"
        >
          <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--cc-grid)' }}>
            <span
              className="font-mono text-[10px] uppercase tracking-[0.2em]"
              style={{ color: 'var(--cc-ink-hush)' }}
            >
              Mission Control
            </span>
            <p className="mt-2 text-sm font-medium leading-snug" style={{ color: 'var(--cc-ink)' }}>
              Hermes operating lanes
            </p>
          </div>

          <nav className="flex flex-col p-2" aria-label="Hermes workstreams">
            {workstreams.map((item) => (
              <WorkstreamNavItem
                key={item.id}
                item={item}
                active={item.id === activeWorkstream?.id}
                onSelect={() => setActiveWorkstreamId(item.id)}
              />
            ))}
          </nav>

          <div className="mt-auto grid grid-cols-3 gap-px p-2" style={{ background: 'var(--cc-grid)' }}>
            <SidebarMetric label="Green" value={green} />
            <SidebarMetric label="Yellow" value={yellow} />
            <SidebarMetric label="Red" value={red} signal />
          </div>
        </aside>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_22rem]" style={{ gap: 1, background: 'var(--cc-grid)' }}>
          <main className="min-w-0" style={{ background: 'var(--cc-bg-soft)' }} aria-label="Selected Hermes lane">
            {activeWorkstream ? (
              <WorkstreamDetail item={activeWorkstream} />
            ) : (
              <div className="px-6 py-8 font-mono text-sm" style={{ color: 'var(--cc-ink-dim)' }}>
                Waiting for command-centre workstreams.
              </div>
            )}
          </main>

          <aside
            className="flex flex-col"
            style={{ background: 'var(--cc-bg-soft)' }}
            aria-label="Add-on registry approval gates"
          >
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--cc-grid)' }}>
              <span
                className="font-mono text-[10px] uppercase tracking-[0.22em]"
                style={{ color: 'var(--cc-ink-dim)' }}
              >
                Approval Queue
              </span>
              <p
                className="mt-2 font-mono text-[11px] leading-relaxed"
                style={{ color: 'var(--cc-ink-hush)' }}
              >
                Add-ons file command-centre tasks before anything goes live.
              </p>
              {addOnOutcome && (
                <div
                  role={addOnOutcome.ok ? 'status' : 'alert'}
                  data-outcome-kind={addOnOutcome.kind}
                  className="mt-3 flex flex-col gap-1 font-mono text-[11px] leading-relaxed"
                  aria-live="polite"
                >
                  <span
                    className="font-semibold"
                    style={{ color: addOnOutcome.ok ? 'var(--cc-ink)' : 'var(--cc-signal-text)' }}
                  >
                    {addOnOutcome.title}
                  </span>
                  <span style={{ color: 'var(--cc-ink-dim)' }}>{addOnOutcome.message}</span>
                  <span style={{ color: 'var(--cc-ink)' }}>{addOnOutcome.nextAction}</span>
                </div>
              )}
            </div>

            {addOns.map((item) => (
              <AddOnRow
                key={item.id}
                item={item}
                pending={pendingAddOnId === item.id}
                onRequest={requestAddOnGate}
              />
            ))}
          </aside>
        </div>
      </div>
    </section>
    </DeckDetails>
  )
}

function WorkstreamNavItem({
  item,
  active,
  onSelect,
}: {
  item: LiveControlWorkstream
  active: boolean
  onSelect: () => void
}) {
  const color = statusColor(item.status, item.ryg)
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-14 w-full items-center gap-3 border px-3 py-2 text-left transition-opacity hover:opacity-90"
      style={{
        borderColor: active ? 'var(--cc-grid)' : 'transparent',
        background: active ? 'var(--cc-bg-soft)' : 'transparent',
        color: 'var(--cc-ink)',
      }}
      aria-label={`${item.lane}: ${item.label}`}
      aria-current={active ? 'page' : undefined}
    >
      <span
        aria-hidden
        className={item.ryg === 'red' || item.status === 'gated' ? styles.breathe : undefined}
        style={{ width: 6, height: 6, background: color, flex: '0 0 6px' }}
      />
      <span className="min-w-0">
        <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: 'var(--cc-ink-hush)' }}>
          {item.lane}
        </span>
        <span className="block truncate text-sm font-medium" style={{ color: active ? 'var(--cc-ink)' : 'var(--cc-ink-dim)' }}>
          {item.label}
        </span>
      </span>
    </button>
  )
}

function SidebarMetric({ label, value, signal = false }: { label: string; value: number; signal?: boolean }) {
  return (
    <div className="px-2 py-3 text-center" style={{ background: 'var(--cc-bg-soft)' }}>
      <span className="block font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: 'var(--cc-ink-hush)' }}>
        {label}
      </span>
      <span className="mt-1 block font-mono text-lg leading-none" style={{ color: signal ? 'var(--cc-signal-text)' : 'var(--cc-ink)' }}>
        {value}
      </span>
    </div>
  )
}

function SummaryCell({ label, value, tone }: { label: string; value: number; tone: ControlRyg }) {
  const color = tone === 'red' ? 'var(--cc-signal-text)' : 'var(--cc-ink)'
  return (
    <div className="min-w-24 px-4 py-3" style={{ background: 'var(--cc-bg-soft)' }}>
      <span
        className="block font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{ color: tone === 'red' ? 'var(--cc-signal-text)' : 'var(--cc-ink-hush)' }}
      >
        {label}
      </span>
      <span
        className="mt-1 block font-mono text-2xl leading-none"
        style={{ color, fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </span>
    </div>
  )
}

function WorkstreamDetail({ item }: { item: LiveControlWorkstream }) {
  const color = statusColor(item.status, item.ryg)
  const textColor = statusTextColor(item.status, item.ryg)
  const isSignal = item.ryg === 'red' || item.status === 'gated'
  const ccTaskEvidence = item.ccTaskId
    ? `CC task ${item.ccTaskId}${item.ccTaskStatus ? ` · ${item.ccTaskStatus}` : ''}`
    : null

  return (
    <article
      className="relative flex min-h-full flex-col gap-5 px-6 py-6"
      style={{ background: 'var(--cc-bg-soft)', borderLeft: `2px solid ${color}` }}
      data-cc-state={item.status}
      aria-label={`${item.label}: ${stateLabel(item.status, item.ryg)}`}
    >
      {isSignal && (
        <span
          aria-hidden
          className={styles.breathe}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--cc-signal)',
          }}
        />
      )}

      <header className="flex flex-col gap-1">
        <span
          className="font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: 'var(--cc-ink-hush)' }}
        >
          {item.id} / {item.lane}
        </span>
        <h3 className="max-w-3xl text-2xl font-semibold leading-tight" style={{ color: 'var(--cc-ink)' }}>
          {item.label}
        </h3>
      </header>

      <div className="grid max-w-4xl gap-2 font-mono text-[11px] leading-relaxed md:grid-cols-2">
        <MetaLine label="state" value={stateLabel(item.status, item.ryg)} color={textColor} />
        <MetaLine label="owner" value={item.owner} />
        <MetaLine label="depends" value={item.dependency} />
        <MetaLine label="gate" value={item.gate} color={isSignal ? 'var(--cc-signal-text)' : undefined} />
      </div>

      <p className="max-w-3xl border px-5 py-4 text-sm leading-relaxed" style={{ borderColor: 'var(--cc-grid)', color: 'var(--cc-ink-dim)' }}>
        {item.nextAction}
      </p>
      {ccTaskEvidence && (
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--cc-ink-dim)' }}
        >
          {ccTaskEvidence}
        </span>
      )}
    </article>
  )
}

function AddOnRow({
  item,
  pending,
  onRequest,
}: {
  item: AddOnGate
  pending: boolean
  onRequest: (item: AddOnGate) => void
}) {
  const color = statusColor(item.state)
  const isSignal = item.state === 'gated'
  const ccTaskEvidence = item.ccTaskId
    ? `CC task ${item.ccTaskId}${item.ccTaskStatus ? ` · ${item.ccTaskStatus}` : ''}`
    : null
  const canRequest = item.state !== 'live' && !ccTaskEvidence

  return (
    <div
      className="relative flex flex-col gap-2 px-5 py-4"
      style={{ borderBottom: '1px solid var(--cc-grid)', borderLeft: `2px solid ${color}` }}
      aria-label={`${item.label}: ${STATUS_LABELS[item.state]}`}
    >
      {isSignal && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--cc-signal)',
          }}
        />
      )}
      <span
        className="font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{ color: 'var(--cc-ink-hush)' }}
      >
        {item.category} / {STATUS_LABELS[item.state]}
      </span>
      <span
        className="font-mono text-[12px] uppercase tracking-[0.12em]"
        style={{ color: 'var(--cc-ink)' }}
      >
        {item.label}
      </span>
      <span
        className="font-mono text-[11px] leading-relaxed"
        style={{ color: isSignal ? 'var(--cc-signal-text)' : 'var(--cc-ink-dim)' }}
      >
        {item.approval}
      </span>
      {ccTaskEvidence && (
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--cc-ink-dim)' }}
        >
          {ccTaskEvidence}
        </span>
      )}
      {canRequest && (
        <button
          type="button"
          onClick={() => onRequest(item)}
          disabled={pending}
          className="mt-1 min-h-11 w-fit border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-opacity disabled:cursor-wait disabled:opacity-60"
          style={{ borderColor: 'var(--cc-grid)', color: 'var(--cc-ink)', background: 'var(--cc-bg)' }}
        >
          {pending ? 'Filing approval task…' : 'Request approval task'}
        </button>
      )}
    </div>
  )
}

function MetaLine({
  label,
  value,
  color = 'var(--cc-ink-dim)',
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3">
      <span className="uppercase tracking-[0.16em]" style={{ color: 'var(--cc-ink-hush)' }}>
        {label}
      </span>
      <span style={{ color }}>{value}</span>
    </div>
  )
}
