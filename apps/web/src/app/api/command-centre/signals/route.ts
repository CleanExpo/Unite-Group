// GET /api/command-centre/signals
//
// Visibility for the autonomous loop's front half: lists the recently-ingested
// signal tasks — those carrying `metadata.signalSource` (set by ingestSignal).
// Founder-scoped, auth-gated. Read-only; nothing executes. The companion to
// POST /api/command-centre/signals/ingest, which creates these `proposed` tasks.
//
// Implementation: reuse the existing founder-scoped listTasks, then filter to
// signal-sourced rows. A focused query is unnecessary — signals are a small,
// recent slice and listTasks already caps + scopes by founder.

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { listTasks, type CommandCentreTask } from '@/lib/command-centre/tasks'

export const dynamic = 'force-dynamic'

/** How many recent tasks to scan for signal provenance. */
const LOOKBACK = 100

interface SignalSummary {
  taskId: string
  title: string
  source: string
  severity: string | null
  status: string
  observedAt: string | null
}

/** Narrow a task's metadata to its signal provenance, or null if not a signal. */
function toSignalSummary(task: CommandCentreTask): SignalSummary | null {
  const meta = task.metadata ?? {}
  const source = meta.signalSource
  if (typeof source !== 'string' || source.length === 0) return null
  return {
    taskId: task.id,
    title: task.title,
    source,
    severity: typeof meta.signalSeverity === 'string' ? meta.signalSeverity : null,
    status: task.status,
    observedAt: typeof meta.observedAt === 'string' ? meta.observedAt : null,
  }
}

export async function GET(): Promise<Response> {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  try {
    const tasks = await listTasks({ founderId: user.id, limit: LOOKBACK })
    const signals = tasks
      .map(toSignalSummary)
      .filter((s): s is SignalSummary => s !== null)

    return NextResponse.json({
      source: 'cc_tasks',
      generatedAt: new Date().toISOString(),
      total: signals.length,
      signals,
    })
  } catch (error) {
    return NextResponse.json(
      { error: sanitiseError(error, 'Failed to list signals') },
      { status: 500 },
    )
  }
}
