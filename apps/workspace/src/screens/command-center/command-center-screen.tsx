import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LanesPanel } from './lanes-panel'
import { cn } from '@/lib/utils'

/**
 * Command Center — owner-layer Mission Control over the existing
 * /api/mission-control-os data (server: mission-control-os.ts). Renders the
 * local feature map, decision surface, runtime receipts, and the brief builder
 * that can both stage and run the prebuilt quick commands.
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

type RuntimeControlPlane = {
  source: 'runtime_checkpoints_only'
  checkedAt: number
  execution: 'disabled'
  runtimes: Array<{
    id: 'hermes' | 'codex' | 'ollama'
    state: 'observed' | 'not_reporting' | 'stale'
    detail: string
  }>
  tasks: Array<{
    taskId: string
    title: string
    owner: string
    runtime: 'hermes' | 'codex' | 'ollama'
    state: 'active' | 'waiting' | 'blocked' | 'complete' | 'unknown'
    evidenceStatus: 'present' | 'missing' | 'not_required'
    deadlineStatus: 'not_set' | 'on_track' | 'overdue'
    evidence: Array<{ label: string; kind: string }>
    blocker: string | null
    nextAction: string | null
  }>
  summary: {
    active: number
    blocked: number
    complete: number
    missingEvidence: number
    overdue: number
    eligibleHandoffs?: number
  }
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

export function appendBriefLine(current: string, line: string): string {
  const trimmedLine = line.trim()
  if (!trimmedLine) return current.trimEnd()

  const existingLines = current
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)

  if (existingLines.includes(trimmedLine)) return current.trimEnd()
  return current.trim() ? `${current.trimEnd()}\n${trimmedLine}` : trimmedLine
}

export function previewPrompt(prompt: string, maxChars = 110): string {
  const compact = prompt.replace(/\s+/g, ' ').trim()
  if (compact.length <= maxChars) return compact
  return `${compact.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
}

export function CommandCenterScreen() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['mission-control-os'],
    queryFn: () => readJson<MissionControlOs>('/api/mission-control-os'),
  })
  const controlPlane = useQuery({
    queryKey: ['runtime-control-plane'],
    queryFn: () => readJson<RuntimeControlPlane>('/api/runtime-control-plane'),
    refetchInterval: 5000,
  })

  // Quick-run: fire a Quick Command headless on the plan-backed gateway and
  // file the output into the 2nd Brain vault (see /api/quick-run).
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<string | null>(null)
  const [briefDraft, setBriefDraft] = useState('')
  const [selectedCommandId, setSelectedCommandId] = useState<string | null>(
    null,
  )
  async function runQuick(cmd: QuickCommand) {
    setSelectedCommandId(cmd.id)
    setBriefDraft((current) =>
      appendBriefLine(current, `Command: ${cmd.label}`),
    )
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
  const controlPlaneData = controlPlane.data
  // Connection rail: Obsidian is live; the rest are stubbed until slice 3.
  const quickCommands = data.quickCommands ?? []
  const activeCommandId = selectedCommandId ?? quickCommands[0]?.id
  const activeCommand =
    quickCommands.find((command) => command.id === activeCommandId) ?? null
  const briefSeeds = [
    { label: 'Outcome', value: 'Outcome: ' },
    { label: 'Audience', value: 'Audience: ' },
    { label: 'Done means', value: 'Done means: ' },
    { label: 'Evidence', value: 'Evidence: ' },
  ]
  const checkedAtLabel = data.checkedAt
    ? new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Sydney',
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(data.checkedAt))
    : null
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
    <div className="h-full min-h-0 overflow-y-auto bg-[radial-gradient(circle_at_top,_#fefdf7_0%,_#f4eddc_42%,_#e6eef9_100%)] px-3 py-3 text-slate-900 md:px-5 md:py-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <section className="frame-elevated border-slate-200/80 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="micro-label text-slate-500">
                Mission Control owner layer
              </div>
              <h1 className="editorial-display mt-3 max-w-3xl text-4xl text-slate-950 sm:text-5xl lg:text-6xl">
                Capture the idea, shape the brief, and hand it to the right lane.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                Use the quick commands as prebuilt prompts, keep the spec in one
                place, and preserve the decision trail before any work moves
                forward.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-300 bg-amber-50 px-3 py-1 text-xs text-amber-900">
                  Mode · {data.mode ?? 'systems-over-models'}
                </span>
                <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700">
                  {data.reference ?? 'Local truth'}
                </span>
                <span className="rounded-full border border-slate-300 bg-teal-50 px-3 py-1 text-xs text-teal-900">
                  {data.obsidian?.status === 'connected'
                    ? `${data.obsidian.markdownFiles} markdown files connected`
                    : 'Obsidian missing'}
                </span>
                <span className="rounded-full border border-slate-300 bg-sky-50 px-3 py-1 text-xs text-sky-900">
                  {quickCommands.length} quick commands
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl border border-slate-200 bg-[#fbfaf5] p-4">
                <div className="text-[11px] font-medium tracking-[0.12em] text-slate-500">
                  Live signals
                </div>
                <div className="mt-3 space-y-2">
                  {rail.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <Dot tone={item.tone} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Checked {checkedAtLabel ?? 'moments ago'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#f7fafc] p-4">
                <div className="text-[11px] font-medium tracking-[0.12em] text-slate-500">
                  Decision
                </div>
                {data.decisionSurface ? (
                  <>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900">
                      {data.decisionSurface.headline}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {data.decisionSurface.recommendation}
                    </p>
                    <p className="mt-3 text-xs text-slate-500">
                      {data.decisionSurface.approvalGate}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    No decision surface is available yet.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#fff8ed] p-4">
                <div className="text-[11px] font-medium tracking-[0.12em] text-slate-500">
                  Delivery
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                    <div className="text-slate-500">Active</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {controlPlaneData?.summary.active ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                    <div className="text-slate-500">Blocked</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {controlPlaneData?.summary.blocked ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                    <div className="text-slate-500">Overdue</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {controlPlaneData?.summary.overdue ?? 0}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white/80 p-3">
                    <div className="text-slate-500">Handoffs</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {controlPlaneData?.summary.eligibleHandoffs ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="frame-panel border-slate-200/80 bg-white/88 p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="text-[11px] font-medium tracking-[0.12em] text-slate-500">
                Spec draft
              </div>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Write the request in plain language
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Start with the outcome, then add the people involved, the
                limits, and the evidence that proves it is done.
              </p>
              <textarea
                value={briefDraft}
                onChange={(event) => setBriefDraft(event.target.value)}
                placeholder="Describe the outcome you want, the people it affects, and what done looks like."
                className="mt-4 min-h-[170px] w-full rounded-2xl border border-slate-300 bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {briefSeeds.map((seed) => (
                  <button
                    key={seed.label}
                    type="button"
                    onClick={() =>
                      setBriefDraft((current) =>
                        appendBriefLine(current, seed.value),
                      )
                    }
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-teal-400 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
                  >
                    {seed.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBriefDraft('')}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
                >
                  Clear draft
                </button>
                <p className="text-xs text-slate-500">
                  {briefDraft
                    ? `${briefDraft.split('\n').filter(Boolean).length} lines in the draft`
                    : 'Use the chips to seed the brief.'}
                </p>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-medium tracking-[0.12em] text-slate-500">
                Quick commands
              </div>
              <div className="mt-3 grid gap-3">
                {quickCommands.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-500">
                    No quick commands are available yet.
                  </p>
                ) : (
                  quickCommands.map((cmd) => {
                    const selected = cmd.id === activeCommandId
                    return (
                      <div
                        key={cmd.id}
                        className={cn(
                          'rounded-2xl border p-4 transition-colors',
                          selected
                            ? 'border-teal-400 bg-teal-50/80'
                            : 'border-slate-200 bg-white/90',
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {cmd.label}
                          </span>
                          <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                            {cmd.mode}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {previewPrompt(cmd.prompt)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCommandId(cmd.id)
                              setBriefDraft((current) =>
                                appendBriefLine(current, `Command: ${cmd.label}`),
                              )
                            }}
                            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-teal-400 hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
                          >
                            Use in brief
                          </button>
                          <button
                            type="button"
                            onClick={() => void runQuick(cmd)}
                            disabled={runningId !== null}
                            className="rounded-full border border-teal-500/40 bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
                          >
                            {runningId === cmd.id ? 'Running…' : 'Run now'}
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
                <div className="text-[11px] font-medium tracking-[0.12em] text-slate-500">
                  Selected command
                </div>
                {activeCommand ? (
                  <>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {activeCommand.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {activeCommand.prompt}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    Choose a command to preview the backend prompt here.
                  </p>
                )}
                {runResult ? (
                  <p className="mt-3 text-sm text-teal-700">{runResult}</p>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          {data.decisionSurface ? (
            <div className="frame-panel border-slate-200/80 bg-white/88 p-4 sm:p-5">
              <div className="text-[11px] font-medium tracking-[0.12em] text-slate-500">
                Decision surface
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {data.decisionSurface.headline}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {data.decisionSurface.recommendation}
              </p>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                  <dt className="text-xs font-medium tracking-[0.12em] text-slate-500">
                    Next safe action
                  </dt>
                  <dd className="mt-2 text-slate-800">
                    {data.decisionSurface.nextSafeAction}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                  <dt className="text-xs font-medium tracking-[0.12em] text-slate-500">
                    Approval gate
                  </dt>
                  <dd className="mt-2 text-slate-800">
                    {data.decisionSurface.approvalGate}
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                  <dt className="text-xs font-medium tracking-[0.12em] text-slate-500">
                    Why
                  </dt>
                  <dd className="mt-2 text-slate-800">
                    {data.decisionSurface.why}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          <section
            className="frame-panel border-slate-200/80 bg-white/88 p-4 sm:p-5"
            aria-label="Runtime receipts"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-medium tracking-[0.12em] text-slate-500">
                Runtime receipts
              </div>
              <span className="text-xs text-slate-500">
                Read-only · execution disabled
              </span>
              {controlPlaneData ? (
                <span className="ml-auto text-xs text-slate-500">
                  {controlPlaneData.summary.active} active ·{' '}
                  {controlPlaneData.summary.blocked} blocked ·{' '}
                  {controlPlaneData.summary.overdue} overdue
                </span>
              ) : null}
            </div>

            {controlPlane.isError ? (
              <p className="mt-3 text-sm text-red-600">
                Runtime receipts could not be read.
              </p>
            ) : controlPlane.isLoading ? (
              <p className="mt-3 text-sm text-slate-500">
                Reading runtime receipts…
              </p>
            ) : controlPlaneData ? (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {controlPlaneData.runtimes.map((runtime) => (
                    <div
                      key={runtime.id}
                      className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Dot
                          tone={
                            runtime.state === 'observed'
                              ? 'on'
                              : runtime.state === 'stale'
                                ? 'warn'
                                : 'unknown'
                          }
                        />
                        {runtime.id}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {runtime.detail}
                      </p>
                    </div>
                  ))}
                </div>
                {controlPlaneData.tasks.length ? (
                  <div className="mt-4 space-y-2">
                    {controlPlaneData.tasks.map((task) => (
                      <div
                        key={task.taskId}
                        className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Dot
                            tone={
                              task.state === 'blocked' ||
                              task.deadlineStatus === 'overdue'
                                ? 'off'
                                : task.state === 'active'
                                  ? 'on'
                                  : 'warn'
                            }
                          />
                          <span className="font-medium text-slate-900">
                            {task.title}
                          </span>
                          <span className="text-slate-500">
                            {task.runtime} · {task.state}
                          </span>
                          {task.evidenceStatus === 'missing' ? (
                            <span className="text-amber-700">
                              evidence missing
                            </span>
                          ) : null}
                        </div>
                        {task.blocker ? (
                          <p className="mt-1 text-red-600">
                            Blocked: {task.blocker}
                          </p>
                        ) : null}
                        {task.nextAction ? (
                          <p className="mt-1 text-slate-500">
                            Next: {task.nextAction}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    No runtime checkpoints have published a task receipt.
                  </p>
                )}
              </>
            ) : null}
          </section>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="frame-panel border-slate-200/80 bg-white/88 p-4 sm:p-5">
            <div className="mb-2 text-[11px] font-medium tracking-[0.12em] text-slate-500">
              Domains
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(data.featureMap ?? []).map((card) => (
                <div
                  key={card.id}
                  className="rounded-2xl border border-slate-200 bg-[#fcfbf8] p-3 transition-colors hover:border-teal-300"
                >
                  <div className="flex items-center gap-2">
                    <Dot tone={toneFor(card.status)} />
                    <span className="text-sm font-medium text-slate-900">
                      {card.label}
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">
                      {card.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">
                    {card.description}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">
                    {card.source}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="frame-panel border-slate-200/80 bg-white/88 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-medium tracking-[0.12em] text-slate-500">
                Launch lanes
              </div>
              <span className="text-xs text-slate-500">
                Generate, queue, and stop model-backed lanes
              </span>
            </div>
            <div className="mt-3">
              <LanesPanel />
            </div>
          </div>
        </section>

        {data.guardrails?.length || data.operatorGates?.length ? (
          <p className="pb-2 text-xs text-slate-500">
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
