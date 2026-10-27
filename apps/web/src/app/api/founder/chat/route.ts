// src/app/api/founder/chat/route.ts
// POST /api/founder/chat — stream a founder chat turn (SSE).
// GET  /api/founder/chat — load the persisted founder thread (UNI-2373 P6).
// PUT  /api/founder/chat — upsert the persisted founder thread (UNI-2373 P6).
//
// Auth/scoping copies the sibling founder route (api/founder/opportunities):
// getUser() session auth → 401, founder-scoped RLS client for every query.
// Model + client reuse the same house path as the public site agent
// (/api/agent): getAIClient() + the ANTHROPIC_MODELS SSOT — founder lane runs
// the most capable registry model (OPUS).
//
// When businessKey is provided, grounding goes through the SAME path the
// public agent uses (src/lib/site-agent/grounding.ts ground()), scoped to the
// authenticated founder's id — the RLS session client applies.
//
// Streams hand-rolled SSE (`data: {"delta": ...}`, `data: [DONE]`) exactly
// like /api/agent. Mission Control rule: real model responses, honest errors —
// failures surface as JSON (pre-stream) or a terminal `{"error": ...}` SSE
// event (mid-stream), never swallowed.
//
// Mission Control chat W1a: GET, PUT and POST check the founder allow-list in-route (403),
// and — only after every early return — records at most one captured delivery
// mission for a build request carrying a valid turnId. Its receipt is the first
// SSE frame (`data: {"mission": ...}`); the answer streams after it unchanged.
// GET re-reads each persisted turn's receipt from cc_tasks in one query.

import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { getUser, createClient } from '@/lib/supabase/server'
import { getAIClient } from '@/lib/ai/client'
import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'
import { ground, formatGroundingContext, type GroundingResult } from '@/lib/site-agent/grounding'
import { captureApiError, sanitiseError } from '@/lib/error-reporting'
import { hasPrivateAccess } from '@/lib/auth/private-access'
import type { Json } from '@/types/database'
import {
  parseFounderChatBody,
  trimToLeadingUserTurn,
  buildFounderSystemPrompt,
} from '@/lib/founder-chat/messages'
import { normaliseStoredMessages, parsePersistBody } from '@/lib/founder-chat/persist'
import {
  captureMission,
  readMissionReceipts,
  type ReceiptReadClient,
} from '@/lib/founder-chat/mission-capture'
import { classifyMissionIntent } from '@/lib/founder-chat/mission-intent'
import type { MissionReceipt } from '@/lib/founder-chat/mission-receipt'
import type { SupabaseLike } from '@/lib/command-centre/tasks'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Founder-facing lane — latest, most capable registry model (SSOT).
const MODEL = ANTHROPIC_MODELS.OPUS
const MAX_OUTPUT_TOKENS = 4096

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const
const ROUTE = '/api/founder/chat'
const STREAM_FAILED_MESSAGE = 'The answer stopped before it finished. Try again.'
const AI_UNAVAILABLE_MESSAGE = 'The chat model is not available right now. Try again later.'
const GROUNDING_FAILED_MESSAGE = 'Could not load business context. Try again.'

const encoder = new TextEncoder()

function sseEvent(payload: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
}

const SSE_DONE = encoder.encode('data: [DONE]\n\n')

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS })
}

export async function GET() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: NO_STORE_HEADERS })
  }
  // Allow-list checked in-route for the thread read too, not only in the proxy.
  if (!hasPrivateAccess(user)) return forbidden()

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('founder_chat_threads')
      .select('messages, business_key, updated_at')
      .eq('founder_id', user.id)
      .maybeSingle()

    if (error) throw error

    const messages = normaliseStoredMessages(data?.messages ?? [])
    const turns = messages.flatMap((m) =>
      m.role === 'user' && m.turnId ? [{ turnId: m.turnId, text: m.content }] : [],
    )
    const receipts = await readMissionReceipts(
      supabase as unknown as ReceiptReadClient,
      user.id,
      turns,
    )

    return NextResponse.json(
      {
        messages,
        businessKey: data?.business_key ?? null,
        updatedAt: data?.updated_at ?? null,
        receipts,
      },
      { headers: NO_STORE_HEADERS },
    )
  } catch (err) {
    return NextResponse.json(
      {
        error: sanitiseError(err, 'Failed to load chat thread', {
          route: '/api/founder/chat',
        }),
      },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }
}

export async function PUT(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: NO_STORE_HEADERS })
  }
  // Allow-list checked in-route for the thread write too, not only in the proxy.
  if (!hasPrivateAccess(user)) return forbidden()

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  const parsed = parsePersistBody(raw)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: NO_STORE_HEADERS })
  }

  const now = new Date().toISOString()

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('founder_chat_threads')
      .upsert(
        {
          founder_id: user.id,
          messages: parsed.messages as unknown as Json,
          business_key: parsed.businessKey,
          updated_at: now,
        },
        { onConflict: 'founder_id' },
      )
      .select('messages, business_key, updated_at')
      .single()

    if (error) throw error

    return NextResponse.json(
      {
        messages: normaliseStoredMessages(data.messages ?? []),
        businessKey: data.business_key ?? null,
        updatedAt: data.updated_at ?? now,
      },
      { headers: NO_STORE_HEADERS },
    )
  } catch (err) {
    return NextResponse.json(
      {
        error: sanitiseError(err, 'Failed to save chat thread', {
          route: '/api/founder/chat',
        }),
      },
      { status: 500, headers: NO_STORE_HEADERS },
    )
  }
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: NO_STORE_HEADERS })
  }
  // The founder allow-list is enforced here as well as in the proxy, before any work.
  if (!hasPrivateAccess(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: NO_STORE_HEADERS })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_STORE_HEADERS })
  }

  const parsed = parseFounderChatBody(raw)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400, headers: NO_STORE_HEADERS })
  }

  let client: Anthropic
  try {
    client = getAIClient()
  } catch (err) {
    // Logged server-side in full; the browser gets a fixed message, never the raw error.
    captureApiError(err, { route: ROUTE, founderId: user.id, stage: 'ai_client' })
    return NextResponse.json({ error: AI_UNAVAILABLE_MESSAGE }, { status: 503, headers: NO_STORE_HEADERS })
  }

  const turns = trimToLeadingUserTurn(parsed.messages)
  const query = turns[turns.length - 1].content

  // Optional business grounding — the same path the public agent uses,
  // founder-scoped by the session (RLS) client.
  let grounding: GroundingResult | null = null
  if (parsed.businessKey) {
    try {
      const supabase = await createClient()
      grounding = await ground(supabase, user.id, parsed.businessKey, query)
    } catch (err) {
      captureApiError(err, { route: ROUTE, founderId: user.id, stage: 'grounding' })
      return NextResponse.json({ error: GROUNDING_FAILED_MESSAGE }, { status: 500, headers: NO_STORE_HEADERS })
    }
    if (!grounding.businessName) {
      // ground() fails closed when the key resolves to no business — for the
      // founder that is a real error, not something to paper over.
      return NextResponse.json(
        { error: `No business found for key "${parsed.businessKey}"` },
        { status: 404, headers: NO_STORE_HEADERS },
      )
    }
  }

  const system = buildFounderSystemPrompt(
    grounding?.businessName ?? null,
    grounding ? formatGroundingContext(grounding.snippets) : '',
  )

  // Mission capture: after every early return, before the stream, in its own
  // try/catch. A failure here never blocks the answer.
  // The session client is a factory: captureMission classifies first and opens
  // it only for a build request, so a question never touches the database.
  let receipt: MissionReceipt | null = null
  try {
    const captured = await captureMission({
      founderId: user.id,
      turnId: parsed.turnId,
      text: query,
      client: async () => (await createClient()) as unknown as SupabaseLike,
    })
    receipt = captured.receipt
  } catch (err) {
    // Unexpected throw: "not confirmed" only where a build capture was owed.
    captureApiError(err, { route: ROUTE, founderId: user.id, turnId: parsed.turnId, stage: 'create_task' })
    receipt = parsed.turnId && classifyMissionIntent(query) === 'build_request' ? { kind: 'not_confirmed' } : null
  }

  // Model-bound turns carry role and content only — never a turnId.
  const modelTurns = turns.map(({ role, content }) => ({ role, content }))

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (receipt) controller.enqueue(sseEvent({ mission: receipt }))
      try {
        const stream = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system,
          messages: modelTurns,
          stream: true,
        })
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(sseEvent({ delta: event.delta.text }))
          }
        }
      } catch (err) {
        // Logged server-side in full; the founder sees a sanitised terminal event.
        captureApiError(err, { route: ROUTE, founderId: user.id, turnId: parsed.turnId, stage: 'stream' })
        controller.enqueue(sseEvent({ error: STREAM_FAILED_MESSAGE }))
      } finally {
        controller.enqueue(SSE_DONE)
        controller.close()
      }
    },
  })

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Grounding-Source': grounding?.source ?? 'off',
      'X-Model': MODEL,
    },
  })
}
