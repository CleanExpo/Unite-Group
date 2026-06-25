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

type BackendDescriptor = {
  id: string
  kind: 'gateway' | 'cli'
  label: string
  available: boolean
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
    </div>
  )
}

function LaneCard({ lane }: { lane: Lane }) {
  const qc = useQueryClient()
  const [mission, setMission] = useState('')

  const runMutation = useMutation({
    mutationFn: () => postJson('/api/lanes/run', { id: lane.id, mission }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lanes'] }),
  })
  const stopMutation = useMutation({
    mutationFn: () => postJson('/api/lanes/stop', { id: lane.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lanes'] }),
  })

  const busy = runMutation.isPending || lane.status === 'running'

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
          onChange={(e) => setMission(e.target.value)}
          placeholder="Mission for this lane…"
          className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-200"
        />
        <button
          type="button"
          onClick={() => runMutation.mutate()}
          disabled={busy || !mission.trim()}
          className="rounded border border-cyan-500/40 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-300 transition-colors hover:bg-cyan-500/10 disabled:opacity-50"
        >
          {busy ? 'Running…' : 'Run'}
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

      {lane.blockedReason ? (
        <p className="mt-2 text-[11px] text-amber-400">{lane.blockedReason}</p>
      ) : null}
      {lane.lastOutput ? (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-neutral-900 p-2 text-[11px] text-neutral-300">
          {lane.lastOutput}
        </pre>
      ) : null}
    </div>
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
    if (!descriptor || !repo.trim()) return
    // Reconstruct the backend object from its id ("gateway:minimax" | "cli:claude-code:max-1").
    const parts = descriptor.id.split(':')
    const backend =
      descriptor.kind === 'gateway'
        ? { kind: 'gateway', provider: parts[1], model: '' }
        : { kind: 'cli', tool: parts[1], account: parts[2] }
    onCreate({ kind: descriptor.kind, backend, role, repo: repo.trim() })
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
                {b.label}
                {b.available ? '' : ' (not configured)'}
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
