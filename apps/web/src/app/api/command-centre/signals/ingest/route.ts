// POST /api/command-centre/signals/ingest
//
// The front-half bridge of the autonomous loop: turns an inbound signal
// (Telegram / cron evidence / error / health) into a `proposed` cc_task via the
// existing intake, then the idea→clarify→classify→lane pipeline takes over.
// Nothing auto-executes — the task lands proposed, gated like a hand-typed idea.
//
// Auth: a founder session OR a valid CRON_SECRET (machine callers — Hermes push,
// a cron poller), per the API context-node cron pattern. Founder-scoped.
//
// This route is the SEAM only — it does NOT wire any transport. Which transport
// pushes here (Hermes / cron) is the open decision in the design proposal
// (docs/superpowers/specs/2026-06-23-signal-ingestion-intake-design.md).

import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import { createTask, listTasks, appendTaskEvent, addEvidenceRecord } from '@/lib/command-centre/tasks'
import { ingestSignal } from '@/lib/command-centre/signals/ingest'
import type { RawSignal, SignalSource, SignalSeverity } from '@/lib/command-centre/signals/normalise'

export const dynamic = 'force-dynamic'

const SOURCES: readonly SignalSource[] = ['telegram', 'cron', 'health', 'error']
const SEVERITIES: readonly SignalSeverity[] = ['info', 'warning', 'critical']

export async function POST(request: Request): Promise<Response> {
  // ── Auth: founder session, or a machine caller bearing CRON_SECRET ──────────
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET?.trim()
  const cronOk = !!cronSecret && authHeader === `Bearer ${cronSecret}`

  let founderId: string
  if (cronOk) {
    const fid = process.env.FOUNDER_USER_ID
    if (!fid) return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 500 })
    founderId = fid
  } else {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    founderId = user.id
  }

  // ── Parse + validate ────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const source = body.source
  if (typeof source !== 'string' || !SOURCES.includes(source as SignalSource)) {
    return NextResponse.json({ error: `source must be one of: ${SOURCES.join(', ')}` }, { status: 400 })
  }
  if (typeof body.externalRef !== 'string' || !body.externalRef) {
    return NextResponse.json({ error: 'externalRef is required' }, { status: 400 })
  }
  if (typeof body.text !== 'string') {
    return NextResponse.json({ error: 'text is required' }, { status: 400 })
  }

  const severity =
    typeof body.severity === 'string' && SEVERITIES.includes(body.severity as SignalSeverity)
      ? (body.severity as SignalSeverity)
      : undefined

  const raw: RawSignal = {
    source: source as SignalSource,
    externalRef: body.externalRef,
    text: body.text,
    observedAt: typeof body.observedAt === 'string' ? body.observedAt : new Date().toISOString(),
    ...(severity ? { severity } : {}),
    ...(typeof body.projectKey === 'string' ? { projectKey: body.projectKey } : {}),
  }

  // ── Delegate ──────────────────────────────────────────────────────────────
  try {
    const result = await ingestSignal(founderId, raw, {
      listTasks,
      createTask,
      appendTaskEvent,
      addEvidenceRecord,
    })
    return NextResponse.json(result, { status: result.status === 'created' ? 201 : 200 })
  } catch (error) {
    return NextResponse.json(
      { error: sanitiseError(error, 'Signal ingestion failed') },
      { status: 500 },
    )
  }
}
