// src/lib/advisory/debate-engine.ts
// Orchestrates the 5-round competitive debate between AI accounting firms.
// Returns an AsyncGenerator<DebateEvent> for real-time streaming.

import { createServiceClient } from '@/lib/supabase/service'
import type {
  FirmKey,
  RoundType,
  DebateEvent,
  FirmProposalData,
  FinancialContext,
  AdvisoryCase,
} from './types'
import { FIRM_KEYS, ROUND_LABELS, FIRM_META } from './types'
import {
  getFirmAgentConfigs,
  buildFirmUserMessage,
  callFirmAgent,
  buildJudgeUserMessage,
  callJudgeAgent,
} from './agents'
import { extractCitations } from './evidence-extractor'
import { notify } from '@/lib/notifications'
import { recallAdvisoryContext, storeAdvisoryOutcome } from './session-memory'

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_RETRIES = 3
// 429s ride out a ~60s rate-limit window, so they get a higher ceiling than
// generic errors (which fail fast).
const RATE_LIMIT_MAX_RETRIES = 5
const RETRY_BASE_MS = 1000

// Max firms calling the model concurrently within a round. The advisory path
// runs through a single Claude-Max account whose per-minute limit is exceeded
// the instant all four firms fire at once (audit F1). Capping the fan-out at 2
// — paired with the Step 1 retry-after/jitter backoff — keeps the burst inside
// the limit window while still running all four firms each round.
// (Founder open item #1: drop to 1 for the single-account worst case, or raise
//  once advisory routes through the multi-provider pool.)
const FIRM_CONCURRENCY = 2

// ── Types ────────────────────────────────────────────────────────────────────

interface ProposalRecord {
  firm: FirmKey
  rawContent: string
  structured: FirmProposalData
  inputTokens: number
  outputTokens: number
  model: string
}

/** Per-round collection of raw proposal content keyed by firm. */
type RoundProposals = Record<FirmKey, string>

// ── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Run the full 5-round debate for an advisory case.
 *
 * Yields DebateEvent objects for real-time streaming to the frontend.
 * Writes all proposals, evidence, and scores to Supabase as the debate progresses.
 *
 * The generator catches individual firm failures so the debate can continue
 * with remaining firms. Only a total failure (all firms down) aborts.
 */
export async function* runDebate(
  caseId: string,
  founderId: string
): AsyncGenerator<DebateEvent> {
  const supabase = createServiceClient()

  // ── Load the case ──────────────────────────────────────────────────────
  const { data: caseRow, error: caseError } = await supabase
    .from('advisory_cases')
    .select('*')
    .eq('id', caseId)
    .eq('founder_id', founderId)
    .single()

  if (caseError || !caseRow) {
    yield { event: 'error', message: `Case not found: ${caseError?.message ?? 'unknown'}` }
    return
  }

  const advisoryCase = caseRow as AdvisoryCase

  if (advisoryCase.status !== 'draft') {
    yield { event: 'error', message: `Case status is '${advisoryCase.status}' — expected 'draft'` }
    return
  }

  const scenario = advisoryCase.scenario
  const financialContext = advisoryCase.financial_context as FinancialContext

  // ── Mark case as debating ──────────────────────────────────────────────
  await supabase
    .from('advisory_cases')
    .update({ status: 'debating', current_round: 0 })
    .eq('id', caseId)

  const firmConfigs = getFirmAgentConfigs()

  // Accumulate proposals across rounds for context injection
  const allRoundProposals: RoundProposals[] = []

  // Track firms whose proposal/evidence failed to persist (Step 3 / F2). A firm
  // appears once even if it dropped in multiple rounds. The Judge and UI use this
  // to label the debate as partial — never present a degraded debate as complete.
  const droppedFirms = new Set<FirmKey>()
  // The firms whose round-5 proposal actually persisted — this is the set the
  // Judge scores from, so it drives the honest "N of 4 firms" count.
  let finalRoundPersistedFirms: FirmKey[] = []

  // ── Execute 5 rounds ───────────────────────────────────────────────────
  for (let round = 1; round <= 5; round++) {
    const roundInfo = ROUND_LABELS[round]
    yield { event: 'round_start', round, type: roundInfo.type }

    // Update case current_round
    await supabase
      .from('advisory_cases')
      .update({ current_round: round })
      .eq('id', caseId)

    const roundResults: ProposalRecord[] = []
    const roundRawContent: RoundProposals = {} as RoundProposals

    // ── Call the firms with a bounded concurrency pool ──────────────────
    // Build thunks (not eager promises) so the pool — not the event loop —
    // decides when each firm fires. At most FIRM_CONCURRENCY run at once,
    // which (with the Step 1 retry-after/jitter backoff) keeps the burst
    // inside the single Claude-Max account's rate-limit window (audit F1).
    const firmTasks = FIRM_KEYS.map((firmKey) => async () => {
      const config = firmConfigs[firmKey]
      const userMessage = buildFirmUserMessage({
        round,
        roundType: roundInfo.type as RoundType,
        scenario,
        financialContext,
        firmKey,
        priorProposals: allRoundProposals.length > 0 ? allRoundProposals : undefined,
      })

      return callFirmAgentWithRetry(config, userMessage, firmKey)
    })

    // Yield firm_start events (before awaiting the pool)
    for (const firmKey of FIRM_KEYS) {
      yield { event: 'firm_start', round, firm: firmKey }
    }

    // Wait for all firms (run ≤ FIRM_CONCURRENCY at a time, order preserved)
    const results = await allSettledWithConcurrency(firmTasks, FIRM_CONCURRENCY)

    for (let i = 0; i < FIRM_KEYS.length; i++) {
      const firmKey = FIRM_KEYS[i]
      const result = results[i]

      if (result.status === 'fulfilled' && result.value) {
        const { proposal, rawContent, inputTokens, outputTokens, model } = result.value

        roundResults.push({
          firm: firmKey,
          rawContent,
          structured: proposal,
          inputTokens,
          outputTokens,
          model,
        })
        roundRawContent[firmKey] = rawContent

        // Preview: first 200 chars of summary
        const preview = proposal.summary.slice(0, 200)
        yield { event: 'firm_response', round, firm: firmKey, preview }
      } else {
        const errorMsg = result.status === 'rejected'
          ? (result.reason instanceof Error ? result.reason.message : String(result.reason))
          : 'Unknown failure'
        yield { event: 'error', message: `${FIRM_META[firmKey].name} failed: ${errorMsg}`, round, firm: firmKey }
      }
    }

    // ── Check we have at least 2 firms (minimum for a meaningful debate) ─
    if (roundResults.length < 2) {
      yield { event: 'error', message: `Only ${roundResults.length} firm(s) responded in round ${round} — aborting debate` }
      await supabase
        .from('advisory_cases')
        .update({ status: 'draft', current_round: round - 1 })
        .eq('id', caseId)
      return
    }

    // ── Persist proposals + evidence to DB ──────────────────────────────
    // Firms whose proposal persisted this round (used for the round-5 Judge set).
    const persistedThisRound: FirmKey[] = []
    for (const record of roundResults) {
      const proposalRow = {
        case_id: caseId,
        founder_id: founderId,
        firm_key: record.firm,
        round,
        round_type: roundInfo.type,
        content: record.rawContent,
        structured_data: record.structured,
        confidence_score: record.structured.confidenceScore,
        risk_level: deriveOverallRisk(record.structured),
        model_used: record.model,
        input_tokens: record.inputTokens,
        output_tokens: record.outputTokens,
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('advisory_proposals')
        .insert(proposalRow)
        .select('id')
        .single()

      if (insertErr) {
        // F2: a failed persist is silent data loss. Drop the firm honestly —
        // continue the debate with the firms that did persist, but record it so
        // the Judge and UI know the set is degraded.
        const reason = `proposal insert failed: ${insertErr.message}`
        console.error(`[debate-engine] Failed to insert proposal for ${record.firm} round ${round}:`, insertErr.message)
        droppedFirms.add(record.firm)
        yield { event: 'firm_dropped', round, firm: record.firm, reason }
        continue
      }

      // Extract and store citations as evidence
      const allCitations = record.structured.strategies.flatMap(s => s.citations)
      if (allCitations.length > 0 && inserted) {
        const evidenceRows = extractCitations(
          inserted.id,
          caseId,
          founderId,
          allCitations
        )
        const { error: evidenceErr } = await supabase
          .from('advisory_evidence')
          .insert(evidenceRows)

        if (evidenceErr) {
          // Evidence-loss is also a degraded set — the firm's proposal is on
          // record but its supporting evidence isn't, so flag it honestly.
          const reason = `evidence insert failed: ${evidenceErr.message}`
          console.error(`[debate-engine] Failed to insert evidence for proposal ${inserted.id}:`, evidenceErr.message)
          droppedFirms.add(record.firm)
          yield { event: 'firm_dropped', round, firm: record.firm, reason }
          continue
        }
      }

      // Proposal (and any evidence) persisted cleanly this round.
      persistedThisRound.push(record.firm)
    }

    // Round 5 is the set the Judge scores from — capture who actually persisted.
    if (round === 5) {
      finalRoundPersistedFirms = persistedThisRound
    }

    allRoundProposals.push(roundRawContent)
    yield { event: 'round_complete', round }
  }

  // ── Judge Phase ────────────────────────────────────────────────────────
  yield { event: 'judge_start' }

  const finalRoundProposals = allRoundProposals[4] // Round 5 (0-indexed = 4)
  if (!finalRoundProposals) {
    yield { event: 'error', message: 'No final round proposals found for judging' }
    return
  }

  // Recall founder's advisory memory to give the judge cross-session context.
  // Runs concurrently — does not block if the memory store is slow or empty.
  const memoryContext = await recallAdvisoryContext(founderId)

  // Partial-debate accounting (Step 3 / F2). The Judge scores the persisted
  // round-5 set; if any firm dropped, it scored fewer than 4 firms and must be
  // told so the summary states it honestly.
  const scoredFirmCount = finalRoundPersistedFirms.length || FIRM_KEYS.length
  const isPartial = droppedFirms.size > 0
  const droppedList = Array.from(droppedFirms)

  try {
    const judgeMessageBase = buildJudgeUserMessage(
      scenario,
      financialContext,
      finalRoundProposals
    )
    // When the debate is partial, tell the Judge up front so its summary is honest.
    const partialNote = isPartial
      ? `\n\n### Degraded debate\nThis debate is PARTIAL: you scored ${scoredFirmCount} of ${FIRM_KEYS.length} firms. ` +
        `The following firm(s) failed to persist and are not in the scored set: ${droppedList.join(', ')}. ` +
        `Your summary MUST state "scored ${scoredFirmCount} of ${FIRM_KEYS.length} firms" and must not present this as a complete debate.`
      : ''
    // Append memory context after the structured case content if available.
    const judgeMessage =
      (memoryContext ? `${judgeMessageBase}\n\n${memoryContext}` : judgeMessageBase) + partialNote

    const judgeResult = await callJudgeAgentWithRetry(judgeMessage)
    const { scores } = judgeResult

    // Stamp the degraded-set markers onto the summary so the case carries them.
    if (isPartial) {
      scores.partial = true
      scores.scoredFirmCount = scoredFirmCount
      scores.droppedFirms = droppedList
      if (!/of \d+ firms/i.test(scores.summary)) {
        scores.summary = `Scored ${scoredFirmCount} of ${FIRM_KEYS.length} firms (partial debate). ${scores.summary}`
      }
    }

    // ── Store judge scores ───────────────────────────────────────────────
    const scoreRows = scores.scores.map(s => ({
      case_id: caseId,
      founder_id: founderId,
      firm_key: s.firmKey,
      legality_score: s.legality,
      compliance_risk_score: s.complianceRisk,
      financial_outcome_score: s.financialOutcome,
      documentation_score: s.documentation,
      ethics_score: s.ethics,
      weighted_total: s.weightedTotal,
      rationale: s.rationale,
      risk_flags: s.riskFlags,
      audit_triggers: s.auditTriggers,
    }))

    const { error: scoreErr } = await supabase
      .from('advisory_judge_scores')
      .insert(scoreRows)

    if (scoreErr) {
      console.error('[debate-engine] Failed to insert judge scores:', scoreErr.message)
    }

    // ── Create approval_queue entry ──────────────────────────────────────
    const { data: queueEntry, error: queueErr } = await supabase
      .from('approval_queue')
      .insert({
        founder_id: founderId,
        type: 'advisory_strategy',
        title: `Advisory: ${advisoryCase.title}`,
        description: scores.summary.slice(0, 500),
        payload: {
          case_id: caseId,
          winning_firm: scores.winner,
          judge_summary: scores.summary,
        },
        status: 'pending',
      })
      .select('id')
      .single()

    // ── Update case to judged ────────────────────────────────────────────
    const caseUpdate: Record<string, unknown> = {
      status: 'pending_review',
      winning_firm: scores.winner,
      judge_summary: scores.summary,
      judge_scores: scores,
    }

    if (queueEntry && !queueErr) {
      caseUpdate.approval_queue_id = queueEntry.id
    }

    await supabase
      .from('advisory_cases')
      .update(caseUpdate)
      .eq('id', caseId)

    yield { event: 'judge_complete', winner: scores.winner, scores: scores.scores }

    // Fire-and-forget notification for debate completion
    const winnerMeta = FIRM_META[scores.winner as FirmKey]
    const winnerEntry = scores.scores.find(
      (s: { firmKey: string }) => s.firmKey === scores.winner
    )
    notify({
      type: 'advisory_update',
      title: `Advisory case complete: ${advisoryCase.title}`,
      body: `Winner: ${winnerMeta?.name ?? scores.winner} (${winnerEntry?.weightedTotal ?? '—'}/100). ${scores.summary}`,
      severity: 'info',
    }).catch(() => {})

    // Persist debate outcome to memory — fire-and-forget so a storage failure
    // never delays the case_complete event emitted below.
    storeAdvisoryOutcome(
      founderId,
      advisoryCase.title,
      caseId,
      judgeResult.scores,
      financialContext
    ).catch(err => {
      console.error('[debate-engine] Failed to store advisory memory:', err instanceof Error ? err.message : err)
    })
  } catch (judgeError) {
    const msg = judgeError instanceof Error ? judgeError.message : 'Unknown judge failure'
    yield { event: 'error', message: `Judge failed: ${msg}` }

    // Mark case as judged (incomplete) so it can be re-triggered
    await supabase
      .from('advisory_cases')
      .update({ status: 'judged' })
      .eq('id', caseId)
    return
  }

  yield { event: 'case_complete' }
}

// ── Concurrency Pool ───────────────────────────────────────────────────────

/**
 * Run `tasks` with at most `limit` in flight at any time, settling every task
 * (never short-circuits on rejection) and returning results in input order —
 * a bounded-concurrency `Promise.allSettled`. No external dependency.
 *
 * A `limit` below 1 is clamped to 1 so the pool can never deadlock.
 *
 * Exported for unit testing (Step 2 of the Advisory Debate QA build spec).
 */
export async function allSettledWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<PromiseSettledResult<T>[]> {
  const cap = Math.max(1, Math.floor(limit))
  const results = new Array<PromiseSettledResult<T>>(tasks.length)
  let next = 0

  async function worker(): Promise<void> {
    for (;;) {
      const index = next++
      if (index >= tasks.length) return
      try {
        results[index] = { status: 'fulfilled', value: await tasks[index]() }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  const workers = Array.from({ length: Math.min(cap, tasks.length) }, () => worker())
  await Promise.all(workers)
  return results
}

// ── Retry Helpers ────────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Ceiling for non-429 errors (network blips etc.). */
  maxRetries?: number
  /** Ceiling for 429/rate-limit errors — higher, to ride out the limit window. */
  rateLimitMaxRetries?: number
  /** Base backoff in ms for full-jitter exponential backoff. */
  baseMs?: number
  /** Injectable sleep (tests). */
  sleep?: (ms: number) => Promise<void>
  /** Injectable RNG (tests). */
  random?: () => number
}

/** True if the error is an HTTP 429 / rate-limit error from the Anthropic SDK. */
function isRateLimitError(err: unknown): boolean {
  const e = err as { status?: number; name?: string; message?: string } | null
  if (!e) return false
  if (e.status === 429) return true
  if (e.name === 'RateLimitError') return true
  const msg = e.message ?? ''
  return msg.includes('429') || /rate.?limit/i.test(msg)
}

/**
 * Read the `retry-after` header (in ms) from an error, if present. Handles both
 * a fetch `Headers` instance and a plain header record. Numeric seconds only —
 * an HTTP-date value returns null and we fall back to exponential backoff.
 */
function getRetryAfterMs(err: unknown): number | null {
  const headers = (err as { headers?: unknown } | null)?.headers
  if (!headers) return null

  let value: string | null = null
  if (typeof (headers as Headers).get === 'function') {
    value = (headers as Headers).get('retry-after')
  } else if (typeof headers === 'object') {
    const rec = headers as Record<string, string>
    value = rec['retry-after'] ?? rec['Retry-After'] ?? null
  }
  if (!value) return null

  const seconds = Number(value)
  return Number.isFinite(seconds) ? seconds * 1000 : null
}

/**
 * Call an async function with rate-limit-aware retry.
 *
 * - On a 429, honour the API `retry-after` header (wait at least that long) and
 *   add jitter on top so concurrent firms desynchronise instead of retrying in
 *   lockstep. 429s get a higher retry ceiling than generic errors.
 * - On a non-429 error, use full-jitter exponential backoff: a random delay in
 *   [0, baseMs · 2^attempt) — independent per caller, so callers don't collide.
 * - Structured-output (Zod/JSON) errors are never retried — the model's output
 *   format is wrong and retrying won't help.
 *
 * Exported for unit testing (Step 1 of the Advisory Debate QA build spec).
 */
export async function callWithRetry<T>(
  fn: () => Promise<T>,
  label: string,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    maxRetries = MAX_RETRIES,
    rateLimitMaxRetries = RATE_LIMIT_MAX_RETRIES,
    baseMs = RETRY_BASE_MS,
    sleep: sleepFn = sleep,
    random = Math.random,
  } = opts

  let lastError: Error | null = null
  let attempt = 0

  for (;;) {
    try {
      return await fn()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      // Don't retry Zod validation errors — the model's output format is wrong.
      if (lastError.message.includes('ZodError') || lastError.message.includes('JSON')) {
        throw lastError
      }

      const rateLimited = isRateLimitError(err)
      const ceiling = rateLimited ? rateLimitMaxRetries : maxRetries
      attempt++
      if (attempt >= ceiling) {
        throw lastError
      }

      const retryAfterMs = rateLimited ? getRetryAfterMs(err) : null
      const delay = retryAfterMs != null
        // Honour the server's retry-after, plus jitter to desync concurrent callers.
        ? retryAfterMs + random() * baseMs
        // Full-jitter exponential backoff (attempt is 1-based here → exponent attempt-1).
        : random() * baseMs * Math.pow(2, attempt - 1)

      console.warn(
        `[debate-engine] ${label} attempt ${attempt} failed, retrying in ${Math.round(delay)}ms:`,
        lastError.message,
      )
      await sleepFn(delay)
    }
  }
}

function callFirmAgentWithRetry(
  config: Parameters<typeof callFirmAgent>[0],
  userMessage: string,
  firmKey: FirmKey,
) {
  return callWithRetry(() => callFirmAgent(config, userMessage), firmKey)
}

function callJudgeAgentWithRetry(userMessage: string) {
  return callWithRetry(() => callJudgeAgent(userMessage), 'Judge')
}

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Derive the worst risk level across all strategies in a proposal.
 */
function deriveOverallRisk(
  proposal: FirmProposalData
): 'low' | 'medium' | 'high' | 'critical' {
  const levels = ['low', 'medium', 'high', 'critical'] as const
  let maxIdx = 0
  for (const strategy of proposal.strategies) {
    const idx = levels.indexOf(strategy.riskLevel)
    if (idx > maxIdx) maxIdx = idx
  }
  return levels[maxIdx]
}
