// src/app/api/agents/events/route.ts
//
// Matrix wall Wave B1 — agent-event ingest (UNI-2378). An estate emitter POSTs
// a batch of redacted session events (heartbeat / tool_call / status); they land
// in cc_agent_events for the wall to render over Realtime.
//
// DORMANT BY DEFAULT: authenticated by a bearer secret (AGENT_EVENTS_SECRET).
// The secret unset (the prod default) ⇒ every call 401s before any work — the
// endpoint is inert until the founder arms it AND applies the migration.
//
// Single-tenant: rows are written for FOUNDER_USER_ID via the service client;
// founder_id is never taken from the body. Redaction: only names and targets
// are accepted; the accessor writes a fixed column set, so no payload/args can
// be persisted even if sent. Write-then-confirm: the insert returns its rows.

import { timingSafeEqual } from 'node:crypto'
import { sanitiseError } from '@/lib/error-reporting'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import {
  insertAgentEvents,
  type AgentEventInput,
  type AgentEventsClientLike,
} from '@/lib/command-centre/agent-events'

export const dynamic = 'force-dynamic'

const MAX_BATCH = 50

const eventSchema = z.object({
  sessionId: z.string().trim().max(128).nullish(),
  agentName: z.string().trim().min(1).max(128),
  surface: z.enum(['codex', 'claude-code', 'pi-ceo-dev', 'local']).optional(),
  machine: z.string().trim().max(128).nullish(),
  repo: z.string().trim().max(256).nullish(),
  projectKey: z.string().trim().max(64).nullish(),
  planKey: z.string().trim().max(64).nullish(),
  eventType: z.enum(['heartbeat', 'tool_call', 'status']),
  toolName: z.string().trim().max(128).nullish(),
  target: z.string().trim().max(512).nullish(),
})

const bodySchema = z.object({
  events: z.array(eventSchema).min(1).max(MAX_BATCH),
})

function timingSafeBearerMatch(request: Request, expectedSecret: string | undefined): boolean {
  const secret = expectedSecret?.trim()
  if (!secret) return false // dormant by default — no secret, no ingest

  const header = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  const receivedBuffer = Buffer.from(header)
  const expectedBuffer = Buffer.from(expected)
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer)
}

function bearerOk(request: Request): boolean {
  return timingSafeBearerMatch(request, process.env.AGENT_EVENTS_SECRET)
}

export async function POST(request: Request) {
  // Bearer gate first: an unarmed endpoint reveals nothing and does no work.
  if (!bearerOk(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const founderId = process.env.FOUNDER_USER_ID?.trim()
  if (!founderId) {
    return NextResponse.json({ error: 'FOUNDER_USER_ID not configured' }, { status: 503 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Invalid batch: ${parsed.error.issues[0]?.message ?? 'validation failed'}` },
      { status: 400 },
    )
  }

  // The parsed events carry only the schema's keys — any args/payload a caller
  // appended is dropped here by zod, and the accessor writes a fixed column set.
  const events: AgentEventInput[] = parsed.data.events

  try {
    const client = createServiceClient() as unknown as AgentEventsClientLike
    const inserted = await insertAgentEvents(client, founderId, events)
    if (inserted.length !== events.length) {
      return NextResponse.json({ error: 'Ingest did not persist all events' }, { status: 500 })
    }
    return NextResponse.json({ ingested: inserted.length }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: sanitiseError(err, 'Failed to ingest agent events') },
      { status: 500 },
    )
  }
}
