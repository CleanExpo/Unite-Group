// src/app/api/founder/chat/route.ts
// POST /api/founder/chat — the founder's direct chat with the estate's agent
// (the Nexus operator assistant) from inside the CRM, without Telegram.
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

import { NextResponse } from 'next/server'
import type Anthropic from '@anthropic-ai/sdk'
import { getUser, createClient } from '@/lib/supabase/server'
import { getAIClient } from '@/lib/ai/client'
import { ANTHROPIC_MODELS } from '@/lib/anthropic/models'
import { ground, formatGroundingContext, type GroundingResult } from '@/lib/site-agent/grounding'
import {
  parseFounderChatBody,
  trimToLeadingUserTurn,
  buildFounderSystemPrompt,
} from '@/lib/founder-chat/messages'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Founder-facing lane — latest, most capable registry model (SSOT).
const MODEL = ANTHROPIC_MODELS.OPUS
const MAX_OUTPUT_TOKENS = 4096

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const

const encoder = new TextEncoder()

function sseEvent(payload: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
}

const SSE_DONE = encoder.encode('data: [DONE]\n\n')

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401, headers: NO_STORE_HEADERS })
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
    // Founder-facing surface: report the real configuration failure.
    const message = err instanceof Error ? err.message : 'Anthropic client not configured'
    return NextResponse.json({ error: message }, { status: 503, headers: NO_STORE_HEADERS })
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
      const message = err instanceof Error ? err.message : 'Grounding failed'
      return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS })
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

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system,
          messages: turns,
          stream: true,
        })
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(sseEvent({ delta: event.delta.text }))
          }
        }
      } catch (err) {
        // Founder-facing: surface the real provider error as a terminal event.
        const message = err instanceof Error ? err.message : 'stream_failed'
        controller.enqueue(sseEvent({ error: message }))
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
