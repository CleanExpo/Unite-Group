import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Lanes panel — the "generate a new IDE" surface in Mission Control.
 * Lists lanes from /api/lanes/list, creates/stops them, and (Slice 2) runs a
 * mission in a lane via /api/lanes/run, showing status + output.
 */

type LaneBackend =
  | { kind: 'gateway'; provider: string; model: string }
  | { kind: 'cli'; tool: 'claude-code' | 'codex'; account: string }

type Lane = {
  id: string
  kind: 'gateway' | 'cli'
  backend: LaneBackend
  role: string
  repo: string
  branch: string
  status: string
  lastOutput?: string
  blockedReason?: string
}

type NexusTaskStatus =
  'pending' | 'running' | 'completed' | 'failed' | 'blocked'

type NexusTask = {
  id: string
  idempotencyKey: string
  laneId: string
  workerId: string
  status: NexusTaskStatus
  createdAt: number
  updatedAt: number
  authority: {
    mode: 'bounded-non-production'
    risk: 'low'
    approval: 'explicit-authenticated-operator'
    approvedAt: number
  }
  runId?: string
  blockedReason?: string
  evidence?: {
    runUri?: string
    eventsUri?: string
    commitSha?: string
  }
}

type NexusWorker = {
  id: string
  label: string
  transport: 'local-cli' | 'local-gateway' | 'tailscale'
  machineId: string
  machineStatus: 'local' | 'unverified'
  enabled: boolean
  reason?: string
}

type NexusTaskSummary = {
  pending: number
  running: number
  completed: number
  blocked: number
}

type NexusTasksResponse = {
  tasks: Array<NexusTask>
  workers: Array<NexusWorker>
  summary: NexusTaskSummary
}

export type BackendDescriptor = {
  id: string
  kind: 'gateway' | 'cli'
  label: string
  backend: LaneBackend
  available: boolean
  unavailableReason?: string
}

export function formatBackendOptionLabel(
  descriptor: BackendDescriptor,
): string {
  if (descriptor.available) return descriptor.label
  return `${descriptor.label} (${descriptor.unavailableReason ?? 'not configured'})`
}

export function buildLaneCreateInput(
  descriptor: BackendDescriptor,
  role: string,
  repo: string,
) {
  const trimmedRepo = repo.trim()
  if (!trimmedRepo) return null
  return {
    kind: descriptor.kind,
    backend: descriptor.backend,
    role,
    repo: trimmedRepo,
  }
}

export function formatWorkerStatus(worker: NexusWorker): string {
  if (worker.enabled) return `${worker.machineId} · admitted`
  return `${worker.machineStatus} · ${worker.reason ?? 'not admitted'}`
}

export function buildQueuedTaskInput(
  id: string,
  mission: string,
  approved: boolean,
  idempotencyKey: string | null,
) {
  const trimmedMission = mission.trim()
  if (!id || !trimmedMission || !approved || !idempotencyKey) return null
  return {
    id,
    mission: trimmedMission,
    approved: true as const,
    idempotencyKey,
  }
}

async function readJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok)
    throw new Error((await res.text()) || `Request failed (${res.status})`)
  return (await res.json()) as T
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T & { ok?: boolean; error?: string }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${res.status})`)
  }
  return data
}

function statusTone(status: string): 'on' | 'warn' | 'off' {
  if (status === 'running' || status === 'idle') return 'on'
  if (status === 'error' || status === 'stopped' || status === 'blocked')
    return 'off'
  return 'warn'
}

function Dot({ tone }: { tone: 'on' | 'warn' | 'off' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        tone === 'on' && 'bg-emerald-500',
        tone === 'warn' && 'bg-amber-400',
        tone === 'off' && 'bg-red-500',
      )}
    />
  )
}

function backendLabel(b: LaneBackend): string {
  return b.kind === 'gateway'
    ? `${b.provider}${b.model ? `/${b.model}` : ''}`
    : `${b.tool} (${b.account})`
}

export function LanesPanel() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const lanesQuery = useQuery({
    queryKey: ['lanes'],
    queryFn: () => readJson<{ lanes: Array<Lane> }>('/api/lanes/list'),
    refetchInterval: 5000,
  })
  const backendsQuery = useQuery({
    queryKey: ['lane-backends'],
    queryFn: () =>
      readJson<{ backends: Array<BackendDescriptor> }>('/api/lanes/backends'),
    enabled: open,
  })
  const tasksQuery = useQuery({
    queryKey: ['nexus-tasks'],
    queryFn: () => readJson<NexusTasksResponse>('/api/lanes/tasks'),
    refetchInterval: 5000,
  })

  const createMutation = useMutation({
    mutationFn: (input: unknown) => postJson('/api/lanes/create', input),
    onSuccess: () => {
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['lanes'] })
    },
  })

  const lanes = lanesQuery.data?.lanes ?? []

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-neutral-500">
          IDE Lanes
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto rounded-md border border-neutral-800 px-2.5 py-1 text-xs text-neutral-200 transition-colors hover:border-cyan-500/40 hover:bg-neutral-900"
        >
          {open ? 'Cancel' : '+ New IDE'}
        </button>
      </div>

      {open ? (
        <NewIdeWizard
          backends={backendsQuery.data?.backends ?? []}
          pending={createMutation.isPending}
          error={
            createMutation.error instanceof Error
              ? createMutation.error.message
              : null
          }
          onCreate={(input) => createMutation.mutate(input)}
        />
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
        {lanes.length === 0 ? (
          <p className="text-xs text-neutral-600">
            No lanes yet. Generate one with “New IDE”.
          </p>
        ) : (
          lanes.map((lane) => <LaneCard key={lane.id} lane={lane} />)
        )}
      </div>

      <NexusTaskDashboard
        data={tasksQuery.data}
        loading={tasksQuery.isPending}
        error={
          tasksQuery.error instanceof Error ? tasksQuery.error.message : null
        }
      />
    </div>
  )
}

function LaneCard({ lane }: { lane: Lane }) {
  const qc = useQueryClient()
  const [mission, setMission] = useState('')
  const [approved, setApproved] = useState(false)
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)

  const queueMutation = useMutation({
    mutationFn: () => {
      const input = buildQueuedTaskInput(
        lane.id,
        mission,
        approved,
        idempotencyKey,
      )
      if (!input) throw new Error('Explicit bounded-task approval is required')
      return postJson('/api/lanes/tasks', input)
    },
    onSuccess: () => {
      setMission('')
      setApproved(false)
      setIdempotencyKey(null)
      qc.invalidateQueries({ queryKey: ['nexus-tasks'] })
    },
  })
  const stopMutation = useMutation({
    mutationFn: () => postJson('/api/lanes/stop', { id: lane.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lanes'] }),
  })

  const busy = queueMutation.isPending || lane.status === 'running'

  return (
    <div className="rounded-lg border border-neutral-800 p-3">
      <div className="flex items-center gap-2">
        <Dot tone={statusTone(lane.status)} />
        <span className="text-sm font-medium text-neutral-100">
          {lane.role}
        </span>
        <span className="text-[10px] text-neutral-500">
          {backendLabel(lane.backend)}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-neutral-500">
          {lane.status}
        </span>
      </div>
      <p
        className="mt-1 truncate text-[10px] text-neutral-600"
        title={lane.branch}
      >
        {lane.branch}
      </p>

      <div className="mt-2 flex items-center gap-2">
        <input
          value={mission}
          onChange={(event) => {
            setMission(event.target.value)
            setApproved(false)
            setIdempotencyKey(null)
          }}
          placeholder="Mission for this lane…"
          className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
        />
        <button
          type="button"
          onClick={() => queueMutation.mutate()}
          disabled={busy || !mission.trim() || !approved}
          className="rounded border border-cyan-500/40 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-300 transition-colors hover:bg-cyan-500/10 disabled:opacity-50"
        >
          {queueMutation.isPending ? 'Queuing…' : 'Queue'}
        </button>
        <button
          type="button"
          onClick={() => stopMutation.mutate()}
          disabled={stopMutation.isPending}
          className="rounded border border-neutral-800 px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-400 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
        >
          Stop
        </button>
      </div>
      <label className="mt-2 flex items-start gap-2 text-[10px] leading-4 text-neutral-400">
        <input
          type="checkbox"
          checked={approved}
          onChange={(event) => {
            const nextApproved = event.target.checked
            setApproved(nextApproved)
            setIdempotencyKey(
              nextApproved ? globalThis.crypto.randomUUID() : null,
            )
          }}
          disabled={busy}
          className="mt-0.5"
        />
        <span>
          I approve this bounded, low-risk, non-production task. It may not
          push, merge, deploy, delete, write to production or dispatch remotely.
        </span>
      </label>

      {lane.blockedReason ? (
        <p className="mt-2 text-[11px] text-amber-400">{lane.blockedReason}</p>
      ) : null}
      {queueMutation.error instanceof Error ? (
        <p className="mt-2 text-[11px] text-red-400">
          {queueMutation.error.message}
        </p>
      ) : null}
      {lane.lastOutput ? (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-neutral-900 p-2 text-[11px] text-neutral-300">
          {lane.lastOutput}
        </pre>
      ) : null}
    </div>
  )
}

function NexusTaskDashboard({
  data,
  loading,
  error,
}: {
  data?: NexusTasksResponse
  loading: boolean
  error: string | null
}) {
  const qc = useQueryClient()
  const [dispatchError, setDispatchError] = useState<string | null>(null)
  const dispatchMutation = useMutation({
    mutationFn: (workerId: string) =>
      postJson<{ outcome: string }>('/api/lanes/dispatch', { workerId }),
    onSuccess: () => {
      setDispatchError(null)
      qc.invalidateQueries({ queryKey: ['lanes'] })
      qc.invalidateQueries({ queryKey: ['nexus-tasks'] })
    },
    onError: (mutationError) => {
      setDispatchError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Dispatch failed',
      )
    },
  })
  const summary = data?.summary ?? {
    pending: 0,
    running: 0,
    completed: 0,
    blocked: 0,
  }
  const tasks = data?.tasks ?? []
  const workers = data?.workers ?? []

  return (
    <section className="mt-4 rounded-lg border border-neutral-800 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-wide text-neutral-500">
          Nexus task queue
        </span>
        {(['pending', 'running', 'completed', 'blocked'] as const).map(
          (status) => (
            <span
              key={status}
              className="text-[10px] uppercase tracking-wide text-neutral-400"
            >
              {status} {summary[status]}
            </span>
          ),
        )}
      </div>

      {loading ? (
        <p className="mt-2 text-xs text-neutral-600">Reading local evidence…</p>
      ) : null}
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

      <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
        {workers.map((worker) => (
          <div
            key={worker.id}
            className="rounded border border-neutral-800 bg-neutral-950 p-2"
          >
            <div className="flex items-center gap-2">
              <Dot tone={worker.enabled ? 'on' : 'off'} />
              <span className="text-xs text-neutral-200">{worker.label}</span>
              <span className="ml-auto text-[10px] text-neutral-500">
                {worker.transport}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-neutral-600">
              {formatWorkerStatus(worker)}
            </p>
            <button
              type="button"
              onClick={() => dispatchMutation.mutate(worker.id)}
              disabled={!worker.enabled || dispatchMutation.isPending}
              className="mt-2 rounded border border-cyan-500/40 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-300 disabled:border-neutral-800 disabled:text-neutral-600"
            >
              Dispatch next
            </button>
          </div>
        ))}
      </div>

      {dispatchError ? (
        <p className="mt-2 text-[11px] text-red-400">{dispatchError}</p>
      ) : null}

      <div className="mt-3 space-y-1">
        {tasks.length === 0 && !loading ? (
          <p className="text-xs text-neutral-600">
            No queued task evidence yet.
          </p>
        ) : (
          tasks.slice(0, 12).map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center gap-2 rounded border border-neutral-900 px-2 py-1 text-[10px]"
            >
              <span className="uppercase text-neutral-400">{task.status}</span>
              <span className="text-neutral-600">{task.workerId}</span>
              <span className="text-neutral-600">{task.laneId}</span>
              {task.runId ? (
                <span className="text-neutral-500">{task.runId}</span>
              ) : null}
              {task.evidence?.commitSha ? (
                <span
                  className="ml-auto font-mono text-neutral-500"
                  title={task.evidence.commitSha}
                >
                  {task.evidence.commitSha.slice(0, 10)}
                </span>
              ) : null}
              {task.blockedReason ? (
                <span className="w-full text-amber-400">
                  {task.blockedReason}
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function NewIdeWizard({
  backends,
  pending,
  error,
  onCreate,
}: {
  backends: Array<BackendDescriptor>
  pending: boolean
  error: string | null
  onCreate: (input: unknown) => void
}) {
  const [backendId, setBackendId] = useState('')
  const [role, setRole] = useState('builder')
  const [repo, setRepo] = useState('')

  function submit() {
    const descriptor = backends.find((b) => b.id === backendId)
    if (!descriptor) return
    const input = buildLaneCreateInput(descriptor, role, repo)
    if (input) onCreate(input)
  }

  return (
    <div className="rounded-lg border border-neutral-800 p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-neutral-500">
          Backend
          <select
            value={backendId}
            onChange={(e) => setBackendId(e.target.value)}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
          >
            <option value="">Select…</option>
            {backends.map((b) => (
              <option key={b.id} value={b.id} disabled={!b.available}>
                {formatBackendOptionLabel(b)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-neutral-500">
          Role
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10px] uppercase tracking-wide text-neutral-500">
          Repo path
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="/Users/.../repo"
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
          />
        </label>
      </div>
      {error ? <p className="mt-2 text-[11px] text-red-400">{error}</p> : null}
      <button
        type="button"
        onClick={submit}
        disabled={pending || !backendId || !repo.trim()}
        className="mt-2 rounded-md border border-cyan-500/40 px-3 py-1 text-xs text-cyan-300 transition-colors hover:bg-cyan-500/10 disabled:opacity-50"
      >
        {pending ? 'Generating…' : 'Generate IDE'}
      </button>
    </div>
  )
}
