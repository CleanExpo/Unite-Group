'use client'

import { useEffect, useState } from 'react'
import Card, { CardDescription, CardTitle } from '@/components/ui/card'
import Button from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { FounderRunQueueAction, FounderRunQueueItem, FounderRunQueueSummary } from '@/lib/founder-os'

interface PiQueueReceipt {
  id: string
  status?: string
  generatedAt?: string
  source?: string
  requiresHumanApproval?: boolean
  nextRecommendedAction?: string
  type?: string
  actor?: string
  note?: string
  evidenceLink?: string
  at?: string
}

interface PiRunQueueResponse {
  queueItem: FounderRunQueueItem
  routingReasons?: string[]
  receipt: PiQueueReceipt | null
  summary?: FounderRunQueueSummary
}

interface PiRunQueueListResponse {
  items: FounderRunQueueItem[]
  summary: FounderRunQueueSummary
}

const EXAMPLE_MESSAGE =
  'Build the Unite-Hub command centre panel for run queue visibility, then test it before moving to the next build.'

export function PiRouterPanel() {
  const [message, setMessage] = useState(EXAMPLE_MESSAGE)
  const [result, setResult] = useState<PiRunQueueResponse | null>(null)
  const [queueItems, setQueueItems] = useState<FounderRunQueueItem[]>([])
  const [summary, setSummary] = useState<FounderRunQueueSummary | null>(null)
  const [transitionNote, setTransitionNote] = useState('')
  const [evidenceLink, setEvidenceLink] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRouting, setIsRouting] = useState(false)
  const [activeAction, setActiveAction] = useState<FounderRunQueueAction | null>(null)

  useEffect(() => {
    void loadQueue()
  }, [])

  async function loadQueue() {
    const response = await fetch('/api/pi/run-queue')
    if (!response.ok) return
    const body = (await response.json()) as PiRunQueueListResponse
    setQueueItems(body.items)
    setSummary(body.summary)
  }

  async function routeMessage() {
    setIsRouting(true)
    setError(null)

    try {
      const response = await fetch('/api/pi/run-queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to route founder message')
      }

      setResult(body)
      await loadQueue()
    } catch (routeError) {
      setError(routeError instanceof Error ? routeError.message : 'Unable to route founder message')
    } finally {
      setIsRouting(false)
    }
  }

  async function transitionActiveItem(action: FounderRunQueueAction) {
    if (!activeItem) return
    setActiveAction(action)
    setError(null)

    try {
      const response = await fetch(`/api/pi/run-queue/${activeItem.id}/transition`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action,
          actor: action === 'approve' ? 'Margot' : 'Pi-Dev-Ops',
          note: transitionNote || undefined,
          evidenceLink: action === 'complete' ? evidenceLink : undefined,
        }),
      })
      const body = await response.json()

      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to update queue item')
      }

      setResult(body)
      setTransitionNote('')
      if (action === 'complete') setEvidenceLink('')
      await loadQueue()
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : 'Unable to update queue item')
    } finally {
      setActiveAction(null)
    }
  }

  const activeItem = result?.queueItem

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Card variant="bordered" padding="lg" className="space-y-5">
        <div>
          <CardTitle>Founder command intake</CardTitle>
          <CardDescription>
            Type the non-coder instruction once. Pi converts it into a task packet, context pack, risk gate, agent lane, machine assignment, and queue item.
          </CardDescription>
        </div>

        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={8}
          className="bg-black/20 text-white/90"
          placeholder="Tell Pi what you want built, checked, researched, routed, or approved..."
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={routeMessage} loading={isRouting} disabled={!message.trim()}>
            Route + queue through Pi
          </Button>
          <span className="text-sm text-white/45">No execution starts here. This is the founder-safe routing gate.</span>
        </div>

        {error && <div className="rounded-sm border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      </Card>

      <Card variant="bordered" padding="lg" className="space-y-4">
        <div>
          <CardTitle>Run queue</CardTitle>
          <CardDescription>Current Pi control tower state for routed tasks.</CardDescription>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Total" value={summary?.total ?? queueItems.length} />
          <Metric label="Queued" value={summary?.queued ?? 0} />
          <Metric label="Approval" value={summary?.waitingForApproval ?? 0} />
          <Metric label="Waiting" value={summary?.waitingForDevice ?? 0} />
        </div>
        <div className="space-y-2">
          {queueItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setResult({ queueItem: item, receipt: item.receipts.at(-1) ?? null })}
              className="w-full rounded-sm border border-white/[0.08] bg-white/[0.02] p-3 text-left hover:border-white/[0.16]"
            >
              <div className="flex items-center justify-between gap-3 text-xs text-white/45">
                <span>{item.taskPacket.portfolioTarget}</span>
                <span>{item.status}</span>
              </div>
              <div className="mt-1 text-sm text-white/75">{item.taskPacket.objective}</div>
            </button>
          ))}
          {queueItems.length === 0 && <div className="text-sm text-white/45">No queued Pi tasks yet.</div>}
        </div>
      </Card>

      {activeItem && result && (
        <div className="lg:col-span-2 grid gap-4 lg:grid-cols-3">
          <ResultCard title="Task packet">
            <ResultRow label="Target" value={activeItem.taskPacket.portfolioTarget} />
            <ResultRow label="Lane" value={activeItem.taskPacket.lane} />
            <ResultRow label="Type" value={activeItem.taskPacket.taskType} />
            <ResultRow label="Risk" value={activeItem.taskPacket.riskLevel} />
            <ResultRow label="Agents" value={activeItem.taskPacket.requiredAgents.join(', ')} />
          </ResultCard>

          <ResultCard title="Machine assignment">
            <ResultRow label="Queue" value={activeItem.status} />
            <ResultRow label="Device" value={activeItem.machineAssignment.assignedDeviceName ?? 'Waiting'} />
            <ResultRow label="Role" value={activeItem.machineAssignment.assignedRole ?? 'Unassigned'} />
            <ResultRow label="Approvals" value={`${activeItem.approvals.length}`} />
          </ResultCard>

          <ResultCard title="Next action">
            <p className="text-sm text-white/80">{activeItem.contextPack.nextRecommendedAction}</p>
            <div className="mt-4 rounded-sm bg-white/[0.03] p-3 text-xs text-white/45">
              Latest receipt: {result.receipt?.id ?? 'none'}
            </div>
          </ResultCard>

          <Card variant="bordered" padding="lg" className="lg:col-span-3 space-y-4">
            <div>
              <CardTitle>Execution controls</CardTitle>
              <CardDescription>Approve, start, block, or complete the task. Completion requires evidence.</CardDescription>
            </div>
            <Textarea
              value={transitionNote}
              onChange={(event) => setTransitionNote(event.target.value)}
              rows={3}
              placeholder="Optional transition note, blocker, or completion summary..."
            />
            <Textarea
              value={evidenceLink}
              onChange={(event) => setEvidenceLink(event.target.value)}
              rows={2}
              placeholder="Evidence link required for Complete, e.g. loop:3x-green or CI URL..."
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => transitionActiveItem('approve')} loading={activeAction === 'approve'}>
                Approve
              </Button>
              <Button variant="secondary" onClick={() => transitionActiveItem('start')} loading={activeAction === 'start'}>
                Start
              </Button>
              <Button variant="danger" onClick={() => transitionActiveItem('block')} loading={activeAction === 'block'}>
                Block
              </Button>
              <Button onClick={() => transitionActiveItem('complete')} loading={activeAction === 'complete'} disabled={!evidenceLink.trim()}>
                Complete with evidence
              </Button>
            </div>
          </Card>

          <Card variant="bordered" padding="lg" className="lg:col-span-3">
            <CardTitle>Context pack + evidence</CardTitle>
            <p className="mt-3 text-sm text-white/70">{activeItem.contextPack.durableSummary}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {activeItem.contextPack.constraints.map((constraint) => (
                <div key={constraint} className="rounded-sm border border-white/[0.08] bg-white/[0.02] p-3 text-sm text-white/65">
                  {constraint}
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {activeItem.contextPack.evidenceLinks.map((link) => (
                <div key={link} className="rounded-sm bg-green-500/10 p-3 text-sm text-green-200">
                  Evidence: {link}
                </div>
              ))}
              {activeItem.blockers.map((blocker) => (
                <div key={blocker} className="rounded-sm bg-red-500/10 p-3 text-sm text-red-200">
                  Blocker: {blocker}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] p-3">
      <div className="text-xs text-white/45">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white/85">{value}</div>
    </div>
  )
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="bordered" padding="lg">
      <CardTitle>{title}</CardTitle>
      <div className="mt-4 space-y-3">{children}</div>
    </Card>
  )
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-2 text-sm last:border-0">
      <span className="text-white/45">{label}</span>
      <span className="text-right text-white/80">{value}</span>
    </div>
  )
}
