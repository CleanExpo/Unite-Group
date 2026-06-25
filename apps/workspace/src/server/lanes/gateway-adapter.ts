/**
 * GatewayLaneAdapter — runs a lane mission through the Hermes gateway's
 * OpenAI-compatible /v1/chat/completions endpoint (always-available core
 * capability), routed to the lane's provider/model. The chat call is injected
 * so the adapter is unit-testable without a live gateway.
 */
import type { LaneAdapter, RunResult } from './adapter'
import type { Lane } from './types'

export interface ChatArgs {
  baseUrl: string
  model: string
  message: string
}

export type ChatFn = (args: ChatArgs) => Promise<string>

export interface GatewayAdapterDeps {
  baseUrl: string
  chat?: ChatFn
}

/** Default chat call: POST {baseUrl}/v1/chat/completions (non-streaming). */
async function defaultChat(args: ChatArgs): Promise<string> {
  const res = await fetch(`${args.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: args.model,
      messages: [{ role: 'user', content: args.message }],
      stream: false,
    }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Gateway chat failed (${res.status}): ${text.slice(0, 300)}`,
    )
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return data.choices?.[0]?.message?.content ?? ''
}

export function createGatewayAdapter(deps: GatewayAdapterDeps): LaneAdapter {
  const chat = deps.chat || defaultChat
  return {
    async run(lane: Lane, mission: string): Promise<RunResult> {
      if (lane.backend.kind !== 'gateway') {
        throw new Error('GatewayLaneAdapter only runs gateway lanes')
      }
      const model = lane.backend.model || lane.backend.provider
      const output = await chat({
        baseUrl: deps.baseUrl,
        model,
        message: mission,
      })
      return { output }
    },
  }
}
