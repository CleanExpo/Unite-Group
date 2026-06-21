// src/lib/provider-pool/adapters/openai-compatible.ts
//
// Chat-completions client for any OpenAI-compatible endpoint — MiniMax
// (https://api.minimax.io/v1) and OpenRouter (https://openrouter.ai/api/v1)
// both speak this shape. PURE of network via an injected fetch (no global
// fetch reliance, no new dependency).
//
// Honest by construction, matching repo-campaigns-github.ts: with no API key it
// returns `not_configured` WITHOUT touching the network; on a 429 it surfaces
// `rate_limited` (with the reset hint when the provider sends one); on any other
// failure it returns `error`. It NEVER throws — a network throw is caught and
// returned as an `error` variant.

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
}

export interface ChatUsage {
  inputTokens: number
  outputTokens: number
}

export interface ChatOk {
  ok: true
  text: string
  usage: ChatUsage
  model: string
}

export interface ChatErr {
  ok: false
  reason: 'not_configured' | 'rate_limited' | 'error'
  detail?: string
  /** ISO timestamp (or raw header value) the limit frees up; null when unknown. */
  resetAt?: string | null
}

export type ChatResult = ChatOk | ChatErr

export interface OpenAICompatibleConfig {
  baseUrl: string
  apiKey: string | undefined
  fetchFn?: typeof fetch
}

/** The OpenAI chat-completions response shape we read (loosely typed). */
interface OpenAIChatResponse {
  model?: string
  choices?: Array<{ message?: { content?: string } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

/** Pull a reset hint from the two common rate-limit headers, else null. */
function readResetAt(headers: Headers): string | null {
  return headers.get('retry-after') ?? headers.get('x-ratelimit-reset') ?? null
}

/**
 * Build a chat-completions caller for an OpenAI-compatible endpoint. The
 * returned function POSTs to `${baseUrl}/chat/completions` with Bearer auth and
 * maps the response into a typed result union — never throwing.
 */
export function makeOpenAICompatibleClient(
  cfg: OpenAICompatibleConfig,
): (req: ChatRequest) => Promise<ChatResult> {
  const fetchFn = cfg.fetchFn ?? fetch
  const apiKey = cfg.apiKey
  const baseUrl = cfg.baseUrl.replace(/\/+$/, '')

  return async (req: ChatRequest): Promise<ChatResult> => {
    // No credential → honest not_configured, with no network call.
    if (!apiKey) return { ok: false, reason: 'not_configured' }

    try {
      const res = await fetchFn(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: req.model,
          messages: req.messages,
          max_tokens: req.maxTokens,
          temperature: req.temperature,
        }),
      })

      if (res.status === 429) {
        return { ok: false, reason: 'rate_limited', resetAt: readResetAt(res.headers) }
      }
      if (!res.ok) {
        return { ok: false, reason: 'error', detail: `HTTP ${res.status}` }
      }

      const data = (await res.json()) as OpenAIChatResponse
      return {
        ok: true,
        text: data.choices?.[0]?.message?.content ?? '',
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
        },
        model: data.model ?? req.model,
      }
    } catch (err) {
      return { ok: false, reason: 'error', detail: err instanceof Error ? err.message : 'fetch failed' }
    }
  }
}
