/**
 * Turns a coaching-session transcript into typed, grounded extractions.
 *
 * One model call per session. Structured output is obtained through tool-use
 * with a strict input_schema on the STABLE Messages API — `output_config` /
 * `strict` exist only under the SDK's `beta` namespace in 0.123.0, and the
 * house pattern (src/lib/coaches/runner.ts) uses `client.messages.create`.
 *
 * The schema is deliberately trade-specific rather than generic "action items".
 * A restoration operator's session produces commitments, quoting metrics and
 * blockers that a generic meeting summariser flattens into bullet points.
 *
 * GROUNDING RULE: every extraction must carry the client's own words in
 * transcript_quote. An extraction without a quote is an assertion, not
 * evidence, and the review screen has nothing to check it against.
 */

import { getAIClient } from '@/lib/ai/client'

/** Matches the kind check constraint on public.coaching_extractions. */
export const EXTRACTION_KINDS = [
  'want',
  'need',
  'requirement',
  'commitment',
  'metric',
  'blocker',
  'decision',
  'open_question',
] as const

export type ExtractionKind = (typeof EXTRACTION_KINDS)[number]

export interface Extraction {
  kind: ExtractionKind
  body: string
  /** Commitments only: who owes it. */
  owner?: 'coach' | 'client' | null
  due_date?: string | null
  /** Metrics only, e.g. "8500" / "AUD" / "per month". */
  metric_value?: string | null
  metric_unit?: string | null
  metric_period?: string | null
  /** The client's own words. Required — see GROUNDING RULE above. */
  transcript_quote: string
  /** Model's own confidence, 0-1. Low-confidence rows sort to the top of review. */
  confidence: number
}

export interface ExtractionResult {
  extractions: Extraction[]
  /** Malformed rows the model returned that were discarded. >0 is worth reading. */
  dropped: number
  model: string
  input_tokens: number
  output_tokens: number
}

/** Sonnet 5 — the identifier already in use across this app. */
const MODEL = 'claude-sonnet-5'

const TOOL_NAME = 'record_extractions'

const TOOL_SCHEMA = {
  type: 'object' as const,
  properties: {
    extractions: {
      type: 'array',
      description:
        'Every distinct want, need, requirement, commitment, metric, blocker, decision or open question the client raised. Empty array if the transcript contains none.',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: [...EXTRACTION_KINDS] },
          body: {
            type: 'string',
            description:
              'One sentence, in plain language, stating the item from the client\'s perspective.',
          },
          owner: {
            type: ['string', 'null'],
            enum: ['coach', 'client', null],
            description: 'Commitments only: who owes the action. Null otherwise.',
          },
          due_date: {
            type: ['string', 'null'],
            description: 'ISO date (YYYY-MM-DD) if a deadline was actually stated. Null if not.',
          },
          metric_value: {
            type: ['string', 'null'],
            description: 'Metrics only: the bare number, no currency symbol or units.',
          },
          metric_unit: { type: ['string', 'null'], description: 'e.g. AUD, hours, jobs.' },
          metric_period: { type: ['string', 'null'], description: 'e.g. per month, per job.' },
          transcript_quote: {
            type: 'string',
            description:
              'A verbatim span from the transcript that evidences this item. Never paraphrase; copy the words exactly.',
          },
          confidence: {
            type: 'number',
            description: '0 to 1. Below 0.6 means you are inferring rather than reading.',
          },
        },
        required: ['kind', 'body', 'transcript_quote', 'confidence'],
        additionalProperties: false,
      },
    },
  },
  required: ['extractions'],
  additionalProperties: false,
}

const SYSTEM_PROMPT = `You extract structured records from business-coaching sessions with Australian trade operators — restoration technicians, builders, plumbers, roofers.

Rules that matter more than completeness:

1. Extract only what the client actually said. If it was not said, it does not exist. Returning an empty array is correct when the transcript contains nothing of a kind.
2. Every item carries a verbatim transcript_quote. Copy the words exactly; never paraphrase into the quote field.
3. A commitment is a specific action someone agreed to do. "I should probably get better at quoting" is a want, not a commitment. "I'll time myself on the next three quotes" is a commitment.
4. A metric is a number about the business the client stated — average job value, jobs per week, hours on a task.
5. Do not invent due dates. Only set due_date when a date or deadline was actually spoken.
6. Set confidence honestly. Below 0.6 means you are inferring rather than reading.

This record drives real coaching decisions and money. An invented item is worse than a missed one.`

/**
 * Reads the extractions array out of the tool_use payload.
 *
 * Two shapes are accepted because the model produces both. Normally
 * `input.extractions` is the array. But on long transcripts it sometimes
 * double-encodes: `input.extractions` arrives as a STRING holding the entire
 * `{"extractions":[...]}` object. Observed live on the 68k-character session-1
 * transcript, where a strict Array.isArray check silently returned zero rows
 * from a response that had cost 3,987 output tokens and contained real data.
 *
 * That is the fake-as-real failure in its purest form — an empty result that
 * reads as "this session contained nothing" — so both shapes are handled and an
 * unparseable payload throws rather than returning [].
 */
function normaliseExtractions(value: unknown): Extraction[] {
  if (Array.isArray(value)) return value as Extraction[]

  if (typeof value === 'string') {
    let parsed: unknown
    try {
      parsed = JSON.parse(value)
    } catch {
      throw new Error('extraction_failed: tool_use payload was a string but not valid JSON')
    }
    if (Array.isArray(parsed)) return parsed as Extraction[]
    if (parsed && typeof parsed === 'object') {
      const inner = (parsed as { extractions?: unknown }).extractions
      if (Array.isArray(inner)) return inner as Extraction[]
    }
    throw new Error('extraction_failed: decoded tool_use payload held no extractions array')
  }

  throw new Error(`extraction_failed: unexpected extractions type "${typeof value}"`)
}

/**
 * Runs extraction over one transcript.
 *
 * Throws AIConfigurationError (from getAIClient) when no API key is configured —
 * deliberately not swallowed, so a missing key surfaces as a failure rather than
 * as an empty result that reads like "this session contained nothing".
 */
export async function extractFromTranscript(transcript: string): Promise<ExtractionResult> {
  if (!transcript.trim()) {
    return { extractions: [], dropped: 0, model: MODEL, input_tokens: 0, output_tokens: 0 }
  }

  const client = getAIClient()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: TOOL_NAME,
        description: 'Record the structured extractions found in this coaching transcript.',
        input_schema: TOOL_SCHEMA,
      },
    ],
    // Force the tool so the reply is always structured, never prose.
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: `Extract the structured record from this coaching session transcript.\n\n<transcript>\n${transcript}\n</transcript>`,
      },
    ],
  })

  const block = response.content.find(
    (c): c is Extract<typeof c, { type: 'tool_use' }> => c.type === 'tool_use'
  )

  if (!block) {
    // An honest failure. Never return [] here — that is indistinguishable from
    // "the session genuinely contained nothing", which is the fake-as-real trap.
    throw new Error('extraction_failed: model returned no tool_use block')
  }

  const raw = block.input as { extractions?: unknown }
  const extractions = normaliseExtractions(raw.extractions)

  if (process.env.COACHING_EXTRACT_DEBUG === '1') {
    console.error(
      `[extract] typeof=${typeof raw.extractions} parsed=${extractions.length} stop=${response.stop_reason}`
    )
  }

  // Drop rows that are malformed — but never drop them SILENTLY.
  //
  // Caught in independent review (P1), and it is the same defect class as the
  // double-encoding bug above, one layer down: if every row fails the filter,
  // returning [] is indistinguishable from a transcript that genuinely
  // contained nothing. A parse failure must not wear the face of an empty
  // session. So: total loss throws; partial loss is reported and counted.
  const kept = extractions.filter(
    (e) => EXTRACTION_KINDS.includes(e.kind) && typeof e.transcript_quote === 'string'
  )
  const dropped = extractions.length - kept.length

  if (dropped > 0 && kept.length === 0) {
    throw new Error(
      `extraction_failed: all ${dropped} returned row(s) were malformed ` +
        `(unrecognised kind, or missing transcript_quote)`
    )
  }
  if (dropped > 0) {
    console.warn(
      `[extract] dropped ${dropped} malformed row(s) of ${extractions.length}; ${kept.length} kept`
    )
  }

  return {
    extractions: kept,
    dropped,
    model: MODEL,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  }
}
