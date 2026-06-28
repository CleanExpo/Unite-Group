import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LanesPanel } from './lanes-panel'
import { cn } from '@/lib/utils'

/**
 * Command Center — Agentic-OS layout over the existing /api/mission-control-os
 * data (server: mission-control-os.ts). Renders our own features (Memory
 * Galaxy, Hermes Jarvis, News Radar, Video Agent, SEO Agent OS, Loop
 * Engineering) in the Chase-AI "Agentic OS" form: connection rail, inspector
 * (decision surface), domain cards (feature map), and a command composer
 * (quick commands). Read-only; quick commands are display-only in this slice.
 */

type FeatureCard = {
  id: string
  label: string
  status: string
  source: string
  description: string
}

type QuickCommand = {
  id: string
  label: string
  prompt: string
  mode: string
}

type DecisionSurface = {
  headline: string
  recommendation: string
  why: string
  nextSafeAction: string
  approvalGate: string
}

type MissionControlOs = {
  ok?: boolean
  title?: string
  mode?: string
  reference?: string
  checkedAt?: number
  guardrails?: Array<string>
  operatorGates?: Array<string>
  decisionSurface?: DecisionSurface
  obsidian?: { status: 'connected' | 'missing'; markdownFiles: number }
  featureMap?: Array<FeatureCard>
  quickCommands?: Array<QuickCommand>
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `Request failed (${response.status})`)
  }
  return (await response.json()) as T
}

// Map the various feature/connection statuses to a traffic-light tone.
function toneFor(status: string): 'on' | 'warn' | 'off' {
  const s = status.toLowerCase()
  if (['connected', 'ready-local', 'linked', 'ready'].includes(s)) return 'on'
  if (s.includes('needs') || s === 'missing' || s === 'disconnected')
    return 'off'
  return 'warn' // dry-run, approval-gated, operator-gated, etc.
}

function Dot({ tone }: { tone: 'on' | 'warn' | 'off' | 'unknown' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        tone === 'on' && 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]',
        tone === 'warn' && 'bg-amber-400',
        tone === 'off' && 'bg-red-500',
        tone === 'unknown' && 'bg-neutral-600',
      )}
    />
  )
}

export function CommandCenterScreen() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['mission-control-os'],
    queryFn: () => readJson<MissionControlOs>('/api/mission-control-os'),
  })

  // Quick-run: fire a Quick Command headless on the plan-backed gateway and
  // file the output into the 2nd Brain vault (see /api/quick-run).
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<string | null>(null)
  async function runQuick(cmd: QuickCommand) {
    setRunningId(cmd.id)
    setRunResult(null)
    try {
      const res = await fetch('/api/quick-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: cmd.prompt, label: cmd.label }),
      })
      const json = (await res.json()) as {
        ok?: boolean
        file?: string
        error?: string
      }
      setRunResult(
        json.ok
          ? `✓ ${cmd.label} filed to ${json.file || 'vault'}`
          : `✗ ${cmd.label}: ${json.error || 'failed'}`,
      )
    } catch (e) {
      setRunResult(`✗ ${cmd.label}: ${String(e)}`)
    } finally {
      setRunningId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-primary-500 dark:text-neutral-400">
        Loading Command Center...
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-center text-sm text-red-500">
        <span>Could not load Command Center status.</span>
        {error instanceof Error ? (
          <span className="text-primary-500 dark:text-neutral-400">
            {error.message}
          </span>
        ) : null}
      </div>
    )
  }

  const obsidianTone = data.obsidian?.status === 'connected' ? 'on' : 'off'
  // Connection rail: Obsidian is live; the rest are stubbed until slice 3.
  const rail: Array<{
    label: string
    tone: 'on' | 'warn' | 'off' | 'unknown'
  }> = [
    { label: 'Hermes', tone: 'unknown' },
    { label: 'Obsidian', tone: obsidianTone },
    { label: 'Video', tone: 'unknown' },
    { label: 'GitHub', tone: 'unknown' },
    { label: 'Linear', tone: 'unknown' },
  ]

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-[#050505] px-3 py-3 text-neutral-200 md:px-5 md:py-4">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {/* Connection / metric rail */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-neutral-800 px-4 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
            Hermes OS
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {rail.map((item) => (
              <span
                key={item.label}
                className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-neutral-400"
              >
                <Dot tone={item.tone} />
                {item.label}
              </span>
            ))}
          </div>
          <span className="ml-auto text-[11px] uppercase tracking-wide text-neutral-500">
            {data.mode ?? 'systems-over-models'}
            {data.checkedAt
              ? ` · ${new Intl.DateTimeFormat('en-AU', {
                  timeZone: 'Australia/Sydney',
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(data.checkedAt))}`
              : null}
          </span>
        </div>

        {/* Inspector — decision surface */}
        {data.decisionSurface ? (
          <div className="rounded-lg border border-neutral-800 p-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Inspector
            </div>
            <h2 className="mt-1 text-base font-semibold text-neutral-100">
              {data.decisionSurface.headline}
            </h2>
            <p className="mt-1 text-sm text-neutral-300">
              {data.decisionSurface.recommendation}
            </p>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
              <div>
                <dt className="uppercase tracking-wide text-neutral-500">
                  Next safe action
                </dt>
                <dd className="mt-0.5 text-neutral-200">
                  {data.decisionSurface.nextSafeAction}
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide text-neutral-500">
                  Approval gate
                </dt>
                <dd className="mt-0.5 text-neutral-200">
                  {data.decisionSurface.approvalGate}
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide text-neutral-500">
                  Why
                </dt>
                <dd className="mt-0.5 text-neutral-200">
                  {data.decisionSurface.why}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        {/* Domain cards — feature map */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
            Domains
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(data.featureMap ?? []).map((card) => (
              <div
                key={card.id}
                className="rounded-lg border border-neutral-800 p-3 transition-colors hover:border-cyan-500/40"
              >
                <div className="flex items-center gap-2">
                  <Dot tone={toneFor(card.status)} />
                  <span className="text-sm font-medium text-neutral-100">
                    {card.label}
                  </span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-neutral-500">
                    {card.status}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-neutral-400">
                  {card.description}
                </p>
                <p className="mt-2 text-[10px] uppercase tracking-wide text-neutral-600">
                  {card.source}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* IDE Lanes — generate & observe model-backed lanes */}
        <LanesPanel />

        {/* Command composer — quick commands (display-only this slice) */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
            Quick commands
          </div>
          <div className="flex flex-wrap gap-2">
            {(data.quickCommands ?? []).map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                title={cmd.prompt}
                disabled={runningId !== null}
                onClick={() => runQuick(cmd)}
                className="flex items-center gap-2 rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-200 transition-colors hover:border-cyan-500/40 hover:bg-neutral-900 disabled:opacity-50"
              >
                {runningId === cmd.id ? 'Running…' : cmd.label}
                <span className="text-[10px] uppercase tracking-wide text-neutral-500">
                  {cmd.mode}
                </span>
              </button>
            ))}
          </div>
          {runResult ? (
            <p className="mt-2 text-[11px] text-cyan-400/80">{runResult}</p>
          ) : null}
        </div>

        {/* Guardrails footer */}
        {data.guardrails?.length || data.operatorGates?.length ? (
          <p className="text-[11px] text-neutral-600">
            {data.guardrails?.length
              ? `Guardrails: ${data.guardrails.join(' · ')}`
              : null}
            {data.guardrails?.length && data.operatorGates?.length
              ? ' · '
              : null}
            {data.operatorGates?.length
              ? `Operator-gated: ${data.operatorGates.join(' · ')}`
              : null}
          </p>
        ) : null}
      </div>
    </div>
  )
}
