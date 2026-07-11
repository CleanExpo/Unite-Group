// src/lib/ai/router.ts
// Capability registry and execute dispatcher for the centralised AI service layer.
// Register capabilities, then call execute(id, input) to dispatch AI requests.

import type Anthropic from '@anthropic-ai/sdk'
import { getAIClient } from './client'
import type { AICapability, AIResponse, RequestContext } from './types'
import { zodToToolSchema, parseStructuredResponse } from './features/structured'
import { createBatch, pollBatchUntilDone, buildBatchRequest } from './features/batch'
import { recallMemories, formatMemoriesForContext } from './features/memory-store'
import { calculateThinkingBudget } from './features/thinking'
import { buildWebSearchTool, parseWebSearchResults } from './features/web-search'
import { extractCitations as extractTextCitations } from './features/citations'
import { buildFileReference } from './features/files'
import { buildSandboxTool, parseSandboxResult } from './features/sandbox'
import { buildMcpServers } from './features/mcp'
import type { Citation } from './types'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ExecuteInput {
  messages: Anthropic.MessageParam[]
  context?: RequestContext
  /**
   * Override the capability's system prompt for this call.
   * Use when the system prompt must be built from call-time data (e.g. brand identity,
   * platform, or user context) rather than static capability config.
   */
  systemPrompt?: string
}

// ── Registry ────────────────────────────────────────────────────────────────

const _registry = new Map<string, AICapability>()

/** Register a capability in the router. Overwrites if id already exists. */
export function registerCapability(cap: AICapability): void {
  _registry.set(cap.id, cap)
}

/** Retrieve a registered capability by id. */
export function getCapability(id: string): AICapability | undefined {
  return _registry.get(id)
}

/** List all registered capability ids. */
export function listCapabilities(): string[] {
  return Array.from(_registry.keys())
}

/** Reset the registry — used in tests to ensure isolation. */
export function resetRegistry(): void {
  _registry.clear()
}

// ── Execute ─────────────────────────────────────────────────────────────────

// ── 429/529 retry (UNI-2344) ─────────────────────────────────────────────────
// Every capability caller shares one Anthropic capacity pool; cron bursts
// (strategy-daily × 7 businesses, ceo-board) were failing outright on 429.
// Bounded retry with exponential backoff + jitter, honouring retry-after.
// Only overload-class errors retry — 4xx logic errors still throw immediately.
const RETRYABLE_STATUS = new Set([429, 529])
// 6 attempts × 3s base expo (3+6+12+24+30 ≈ 75s of backoff) lets a per-minute
// rate_limit_error clear even when Anthropic sends no retry-after header — the
// old 4×2s (~14s) exhausted inside the same limited minute. MAX_TOTAL_BACKOFF
// then hard-bounds cumulative waiting so a run can never approach the crons'
// 120s function ceiling (i.e. never trade a 429 for a timeout).
const MAX_ATTEMPTS = 6
const BASE_DELAY_MS = 3_000
const MAX_TOTAL_BACKOFF_MS = 90_000

function retryDelayMs(attempt: number, retryAfterHeader: string | null | undefined): number {
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : NaN
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1_000, 60_000)
  const expo = BASE_DELAY_MS * 2 ** (attempt - 1)
  return Math.min(expo, 30_000) + Math.floor(Math.random() * 500)
}

async function createWithRetry(
  client: ReturnType<typeof getAIClient>,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  let lastError: unknown
  let totalBackoff = 0
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await client.messages.create(params)
    } catch (err) {
      lastError = err
      const status = (err as { status?: number }).status
      if (status === undefined || !RETRYABLE_STATUS.has(status) || attempt === MAX_ATTEMPTS) throw err
      const headers = (err as { headers?: Record<string, string> | Headers }).headers
      const retryAfter =
        headers instanceof Headers ? headers.get('retry-after') :
        headers ? headers['retry-after'] : undefined
      const delay = retryDelayMs(attempt, retryAfter)
      // Never let cumulative backoff approach the function budget — give up
      // early rather than retry into a timeout.
      if (totalBackoff + delay > MAX_TOTAL_BACKOFF_MS) throw err
      totalBackoff += delay
      console.warn(`[ai/router] ${status} from Anthropic — retry ${attempt}/${MAX_ATTEMPTS - 1} in ${delay}ms`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

/** Dispatch an AI request through a registered capability. */
export async function execute(
  capabilityId: string,
  input: ExecuteInput
): Promise<AIResponse> {
  const cap = _registry.get(capabilityId)
  if (!cap) {
    throw new Error(
      `Capability '${capabilityId}' is not registered. Call registerCapability() first.`
    )
  }

  // Resolve system prompt — caller override takes precedence over capability config.
  // This allows call-time data (brand identity, platform context) to shape the prompt
  // without baking dynamic data into the capability definition.
  let systemPrompt =
    input.systemPrompt ??
    (typeof cap.systemPrompt === 'function'
      ? cap.systemPrompt(input.context ?? { userId: '' })
      : cap.systemPrompt)

  // Memory injection — recalled memories are prepended to the system prompt.
  // Opt-in per capability via features.memory.enabled; requires context.userId.
  // Not applied in batch paths (fire-and-forget — no per-call recall makes sense there).
  if (cap.features.memory?.enabled && input.context?.userId) {
    const memories = await recallMemories(input.context.userId, cap.id)
    const block = formatMemoriesForContext(memories)
    if (block) {
      systemPrompt = `${systemPrompt}\n\n${block}`
    }
  }

  // Build Anthropic API params
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: cap.model,
    max_tokens: cap.maxTokens,
    system: systemPrompt,
    messages: input.messages,
  }

  // Temperature — omit when thinking is enabled (Anthropic requires temperature = 1.0 for thinking;
  // omitting it lets the API apply the correct default automatically).
  if (cap.temperature !== undefined && !cap.features.thinking) {
    params.temperature = cap.temperature
  }

  // Thinking feature — adaptive or static budget.
  let thinkingBudget: number | undefined
  if (cap.features.thinking) {
    const t = cap.features.thinking
    if (t.adaptive) {
      // Derive budget from actual user message complexity at call-time.
      const userContent = input.messages
        .filter(m => m.role === 'user')
        .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
        .join('\n')
      thinkingBudget = calculateThinkingBudget(userContent)
      if (t.minBudget !== undefined) thinkingBudget = Math.max(thinkingBudget, t.minBudget)
      if (t.maxBudget !== undefined) thinkingBudget = Math.min(thinkingBudget, t.maxBudget)
    } else {
      thinkingBudget = t.budgetTokens ?? 10000
    }
    // Adaptive thinking — the capabilities that declare thinking (analyze, coach)
    // route to Opus 4.8, where `{ type: 'enabled', budget_tokens }` returns 400.
    // The computed thinkingBudget is retained below purely as response telemetry.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(params as any).thinking = { type: 'adaptive' }
  }

  // Structured output — force tool_use so Claude returns schema-conformant JSON.
  // The tool name is derived from the capability id (hyphens → underscores + _output).
  let structuredToolName: string | undefined
  if (cap.features.structuredOutput) {
    structuredToolName = `${cap.id.replace(/-/g, '_')}_output`
    const tool = zodToToolSchema(
      structuredToolName,
      cap.features.structuredOutput,
      `Structured output for ${cap.id}`
    ) as unknown as Anthropic.Tool
    params.tools = [tool]
    params.tool_choice = { type: 'tool', name: structuredToolName }
  }

  // Web search tool — Anthropic server-side tool injected as a special tools entry.
  // Incompatible with structuredOutput (tool_choice cannot be forced alongside web search).
  if (cap.features.webSearch && !cap.features.structuredOutput) {
    const wsConfig = typeof cap.features.webSearch === 'object' ? cap.features.webSearch : {}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(params as any).tools = [buildWebSearchTool(wsConfig)]
  }

  // Code execution sandbox — inject alongside any existing tools.
  if (cap.features.codeExecution) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = params as any
    p.tools = [...(p.tools ?? []), buildSandboxTool()]
  }

  // File attachments — prepend document blocks to the first user message.
  // Files must be pre-uploaded via uploadAndCacheFile(); only IDs are passed here.
  if (cap.features.fileIds?.length) {
    const fileBlocks = cap.features.fileIds.map(id => buildFileReference(id))
    const msgs = [...params.messages]
    const firstUserIdx = msgs.findIndex(m => m.role === 'user')
    if (firstUserIdx >= 0) {
      const orig = msgs[firstUserIdx]
      const origContent = typeof orig.content === 'string'
        ? [{ type: 'text' as const, text: orig.content }]
        : [...(orig.content as object[])]
      msgs[firstUserIdx] = {
        ...orig,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: [...(fileBlocks as any[]), ...origContent],
      }
    }
    params.messages = msgs
  }

  // MCP servers — resolved from registry and injected for server-side tool access.
  if (cap.features.mcpServers?.length) {
    const servers = buildMcpServers(cap.features.mcpServers)
    if (servers.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(params as any).mcp_servers = servers
    }
  }

  const client = getAIClient()
  const response = await createWithRetry(client, params)

  // Extract content from response blocks
  let textContent = ''
  let thinkingContent: string | undefined
  let structuredData: unknown | undefined

  for (const block of response.content) {
    if (block.type === 'text') {
      textContent += (textContent ? '\n\n' : '') + block.text
    } else if (block.type === 'thinking' && 'thinking' in block) {
      thinkingContent = (block as { type: 'thinking'; thinking: string }).thinking
    }
  }

  // Parse structured output from tool_use block
  if (cap.features.structuredOutput && structuredToolName) {
    structuredData = parseStructuredResponse(
      response.content,
      structuredToolName,
      cap.features.structuredOutput
    )
  }

  // Parse code execution sandbox result
  let sandboxResult: AIResponse['sandboxResult'] | undefined
  if (cap.features.codeExecution) {
    const sr = parseSandboxResult(response.content as unknown[])
    if (sr) sandboxResult = sr
  }

  // ── Citation extraction ────────────────────────────────────────────────────

  let citations: Citation[] | undefined

  // 1. Web search citations — parsed from web_search_tool_result blocks in the response.
  if (cap.features.webSearch) {
    const webCitations = parseWebSearchResults(response.content as unknown[])
    if (webCitations.length > 0) {
      citations = webCitations
    }
  }

  // 2. Text citations — ATO rulings, legislation, case law extracted from the response text.
  if (cap.features.citations && textContent) {
    const textCitations = extractTextCitations(textContent).map(c => ({
      type: c.type,
      title: c.title,
      url: c.url,
      content: c.reference,
    }))
    if (textCitations.length > 0) {
      citations = [...(citations ?? []), ...textCitations]
    }
  }

  return {
    content: textContent,
    thinking: thinkingContent,
    structuredData,
    ...(citations?.length ? { citations } : {}),
    ...(sandboxResult ? { sandboxResult } : {}),
    ...(thinkingBudget !== undefined ? { thinkingBudget } : {}),
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
    model: response.model,
  }
}

// ── Batch Execute ─────────────────────────────────────────────────────────────

export interface BatchExecuteResult {
  batchId: string
  /**
   * customId → AIResponse map. Populated when the batch completes within the
   * poll timeout. Failed/cancelled/expired items are omitted.
   */
  results?: Map<string, AIResponse>
  /** True when the batch did not complete before the timeout expired. */
  pending: boolean
}

/**
 * Submit multiple capability requests as a single Anthropic batch (50% cost saving).
 * Polls until completion or timeout, then returns results keyed by customId.
 *
 * Best for non-urgent cron workloads: email triage, nightly content generation,
 * engagement reply generation. NOT suitable for interactive user-facing flows.
 *
 * @param capabilityId - Registered capability to use for all requests
 * @param inputs - Array of inputs, each with a unique customId for result lookup
 * @param opts.pollIntervalMs - Polling interval (default 5 s)
 * @param opts.timeoutMs - Give up after this many ms (default 4 min)
 */
export async function batchExecute(
  capabilityId: string,
  inputs: Array<ExecuteInput & { customId: string }>,
  opts?: { pollIntervalMs?: number; timeoutMs?: number }
): Promise<BatchExecuteResult> {
  const cap = _registry.get(capabilityId)
  if (!cap) {
    throw new Error(
      `Capability '${capabilityId}' is not registered. Call registerCapability() first.`
    )
  }

  // Derive structured output tool name (same formula as execute())
  let structuredToolName: string | undefined
  let tools: Anthropic.Tool[] | undefined
  let toolChoice: Anthropic.ToolChoice | undefined

  if (cap.features.structuredOutput) {
    structuredToolName = `${cap.id.replace(/-/g, '_')}_output`
    tools = [
      zodToToolSchema(
        structuredToolName,
        cap.features.structuredOutput,
        `Structured output for ${cap.id}`
      ) as unknown as Anthropic.Tool,
    ]
    toolChoice = { type: 'tool', name: structuredToolName }
  }

  // Build one BatchRequest per input
  const requests = inputs.map((input) => {
    const systemPrompt =
      input.systemPrompt ??
      (typeof cap.systemPrompt === 'function'
        ? cap.systemPrompt(input.context ?? { userId: '' })
        : cap.systemPrompt)

    return buildBatchRequest(input.customId, {
      model: cap.model,
      maxTokens: cap.maxTokens,
      system: systemPrompt,
      messages: input.messages,
      ...(tools ? { tools, tool_choice: toolChoice } : {}),
      ...(cap.temperature !== undefined ? { temperature: cap.temperature } : {}),
    })
  })

  // Submit the batch
  const batch = await createBatch(requests)

  // Poll until done or timeout
  const batchItems = await pollBatchUntilDone(batch.id, opts)

  if (!batchItems) {
    // Batch still processing — caller must handle (e.g. fallback to sync)
    return { batchId: batch.id, pending: true }
  }

  // Map results: customId → AIResponse (skip non-succeeded items)
  const resultsMap = new Map<string, AIResponse>()

  for (const item of batchItems) {
    if (item.status !== 'succeeded' || !item.message) continue

    let textContent = ''
    let thinkingContent: string | undefined
    let structuredData: unknown | undefined

    for (const block of item.message.content) {
      const b = block as Record<string, unknown>
      if (b.type === 'text') {
        textContent += (textContent ? '\n\n' : '') + (b.text as string)
      } else if (b.type === 'thinking' && b.thinking) {
        thinkingContent = b.thinking as string
      }
    }

    if (cap.features.structuredOutput && structuredToolName) {
      structuredData = parseStructuredResponse(
        item.message.content,
        structuredToolName,
        cap.features.structuredOutput
      )
    }

    resultsMap.set(item.customId, {
      content: textContent,
      thinking: thinkingContent,
      structuredData,
      usage: {
        inputTokens: item.message.usage.input_tokens,
        outputTokens: item.message.usage.output_tokens,
      },
      model: item.message.model,
    })
  }

  return { batchId: batch.id, results: resultsMap, pending: false }
}
