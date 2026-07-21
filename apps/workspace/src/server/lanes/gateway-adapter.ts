/**
 * GatewayLaneAdapter — runs a lane mission through the Hermes gateway's
 * OpenAI-compatible /v1/chat/completions endpoint, routed only after the
 * provider/model catalogue probe succeeds. The chat call is injected
 * so the adapter is unit-testable without a live gateway.
 */
import { sanitiseLaneOutput } from './adapter'
import type { LaneAdapter, LaneRunOptions, RunResult } from './adapter'
import type { Lane } from './types'

export interface ChatArgs {
  baseUrl: string
  bearerToken?: string
  model: string
  message: string
  signal?: AbortSignal
}

export type ChatFn = (args: ChatArgs) => Promise<string>

export interface GatewayAdapterDeps {
  baseUrl: string
  bearerToken?: string
  chat?: ChatFn
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Default chat call: POST {baseUrl}/v1/chat/completions (non-streaming). */
async function defaultChat(args: ChatArgs): Promise<string> {
  const res = await fetch(`${args.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(args.bearerToken
        ? { authorization: `Bearer ${args.bearerToken}` }
        : {}),
    },
    body: JSON.stringify({
      model: args.model,
      messages: [{ role: 'user', content: args.message }],
      stream: false,
    }),
    signal: args.signal
      ? AbortSignal.any([args.signal, AbortSignal.timeout(120_000)])
      : AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Gateway chat failed (${res.status}): ${sanitiseLaneOutput(text, 300)}`,
    )
  }
  const data: unknown = await res.json()
  const choice =
    isRecord(data) && Array.isArray(data.choices) ? data.choices[0] : undefined
  const message = isRecord(choice) ? choice.message : undefined
  const content = isRecord(message) ? message.content : undefined
  if (typeof content !== 'string') {
    throw new Error('Malformed gateway response: assistant content is missing')
  }
  return content
}

export function createGatewayAdapter(deps: GatewayAdapterDeps): LaneAdapter {
  const chat = deps.chat || defaultChat
  return {
    async run(
      lane: Lane,
      mission: string,
      options: LaneRunOptions = {},
    ): Promise<RunResult> {
      if (lane.backend.kind !== 'gateway') {
        throw new Error('GatewayLaneAdapter only runs gateway lanes')
      }
      const model = lane.backend.model.trim()
      if (!model) throw new Error('An exact gateway model is required')
      try {
        const output = await chat({
          baseUrl: deps.baseUrl,
          bearerToken: deps.bearerToken,
          model,
          message: mission,
          signal: options.signal,
        })
        return { output: sanitiseLaneOutput(output) }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Gateway execution failed'
        throw new Error(sanitiseLaneOutput(message, 400))
      }
    },
  }
}
