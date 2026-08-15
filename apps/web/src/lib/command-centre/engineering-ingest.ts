// src/lib/command-centre/engineering-ingest.ts
//
// Turns a REVIEWED engineering.md into the `steps` plan that
// `decomposeApprovedIdea` already accepts, so an SPM planning artefact can
// generate the cc_tasks queue the Nexus Runner claims.
//
// Why engineering.md and not spec.md: the SPM spec template is a prose contract
// that the artefacts on disk have drifted from — of the ten `.spm/*.md` files,
// one carries the "Delivery slices" section and nine do not. Parsing that would
// return an empty plan for most inputs, which is the silent-empty failure this
// module exists to avoid. `engineering.md` is the SPM skill's *required* output
// and is already machine-checked by `engineering_gate.py`: typed frontmatter,
// a spec + spec_sha256 binding, and a `categories` mapping over ten fixed
// categories with four legal states.
//
// This module does NOT reimplement that gate. The gate is Python living outside
// the deployable tree, so a lambda cannot run it. What this module does instead
// is refuse anything it cannot positively confirm is reviewed and unblocked, and
// report WHY — never degrade to an empty plan, because an empty plan silently
// becomes "no work to do".
//
// Nothing here calls a model, writes a task, or touches the network. It maps a
// document to a plan; `decomposeApprovedIdea` remains the only writer.

import type { DecompositionStep } from './decompose'
import type { TaskRiskLevel } from './tasks'

/**
 * Where the contract below is copied FROM. This module mirrors constants owned
 * by another process, so the mirror must be findable and checkable.
 *
 * The gate is not importable: it is Python, and it lives outside the repo (and
 * therefore outside CI's checkout). `engineering-ingest-drift.test.ts` compares
 * the two whenever the gate is present, and when it is absent asserts this
 * provenance is still declared rather than passing silently.
 */
export const GATE_SOURCE_OF_TRUTH =
  '~/.claude/skills/engineering-requirements/scripts/engineering_gate.py'

/** The ten categories `engineering_gate.py` requires. Order is not significant here. */
export const ENGINEERING_CATEGORIES = [
  'data_model',
  'invariants',
  'failure_modes',
  'interface_contract',
  'concurrency',
  'migration',
  'rollback',
  'observability',
  'budget',
  'test_oracle',
] as const

export type EngineeringCategory = (typeof ENGINEERING_CATEGORIES)[number]

/** The four states the gate accepts for a category. */
export const LEGAL_STATES = ['DECIDED', 'PRESCRIBED', 'DEFERRED', 'N/A'] as const
export type CategoryState = (typeof LEGAL_STATES)[number]

/**
 * States that represent settled work to do.
 *
 * DECIDED — the spec answered it. PRESCRIBED — the reviewer supplied an answer
 * the spec did not give; still settled, and deliberately distinguishable so a
 * prescribed answer is never mistaken for one the author made.
 *
 * DEFERRED and N/A generate NO step. Deferring a decision is not a licence to
 * build against it, and manufacturing a task for a deferred category would put
 * unplanned work into the founder's queue.
 */
const WORK_GENERATING_STATES = new Set<CategoryState>(['DECIDED', 'PRESCRIBED'])

/**
 * Implementation order. Fixed, not derived from the document, so the same
 * artefact always produces the same queue — `decomposeApprovedIdea` links each
 * task to the previous one, so ordering is a real dependency chain, not cosmetics.
 *
 * Shape follows the obligation order an engineer would actually take: the data
 * shape and its migration precede the contract that exposes it; behaviour under
 * concurrency and failure precedes the ability to undo it; observability and cost
 * precede the oracle that proves the whole thing.
 */
const CATEGORY_ORDER: readonly EngineeringCategory[] = [
  'data_model',
  'migration',
  'interface_contract',
  'invariants',
  'concurrency',
  'failure_modes',
  'rollback',
  'observability',
  'budget',
  'test_oracle',
]

/**
 * Risk carried into the generated task.
 *
 * `decomposeApprovedIdea` sets `humanApprovalRequired` for anything above 'low',
 * so this mapping decides which steps stop for a human. Migration and rollback
 * are the categories whose mistakes are least reversible, so they are the ones
 * that must not slip through as low.
 */
const CATEGORY_RISK: Readonly<Record<EngineeringCategory, TaskRiskLevel>> = {
  data_model: 'medium',
  migration: 'high',
  interface_contract: 'medium',
  invariants: 'medium',
  concurrency: 'medium',
  failure_modes: 'medium',
  rollback: 'high',
  observability: 'low',
  budget: 'low',
  test_oracle: 'medium',
}

/** Human-facing label per category, used to build the task title. */
const CATEGORY_LABEL: Readonly<Record<EngineeringCategory, string>> = {
  data_model: 'Data model',
  migration: 'Migration',
  interface_contract: 'Interface contract',
  invariants: 'Invariants',
  concurrency: 'Concurrency & ordering',
  failure_modes: 'Failure modes',
  rollback: 'Rollback path',
  observability: 'Observability',
  budget: 'Cost & budget',
  test_oracle: 'Test oracle',
}

export interface CategoryEntry {
  state: CategoryState
  /** The gate treats `blocking: true` as "must be resolved before this becomes code". */
  blocking: boolean
  /** The reviewer's answer for this category, when the document carries one. */
  answer: string
}

export interface EngineeringArtifact {
  /** Path of the spec this review is bound to, from frontmatter `spec`. */
  spec: string
  /** SHA256 of that spec at review time, from frontmatter `spec_sha256`. */
  specSha256: string
  /** Derived by the gate: PASS, or BLOCKED when any category is blocking. */
  status: 'PASS' | 'BLOCKED'
  categories: Readonly<Record<EngineeringCategory, CategoryEntry>>
}

/** Why an artefact was refused. Never thrown away — the caller must be able to say why. */
export class EngineeringIngestRefusal extends Error {
  readonly reasons: string[]

  constructor(reasons: string[]) {
    super(`engineering.md refused: ${reasons.join('; ')}`)
    this.name = 'EngineeringIngestRefusal'
    this.reasons = reasons
  }
}

// ─── Frontmatter ──────────────────────────────────────────────────────────────

/**
 * Minimal YAML reader for the exact frontmatter shape the gate enforces.
 *
 * Deliberately not a general YAML parser: this reads a two-level mapping with
 * scalar leaves, which is all `engineering_gate.py` permits in `categories`.
 * Anything it cannot interpret becomes a refusal, never a silent omission — a
 * category that failed to parse must not look identical to one marked N/A.
 */
export function parseFrontmatter(raw: string): Record<string, unknown> {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) {
    throw new EngineeringIngestRefusal(['no YAML frontmatter block'])
  }

  const root: Record<string, unknown> = {}
  let currentKey: string | null = null
  let currentMap: Record<string, unknown> | null = null
  let nestedKey: string | null = null
  let nestedMap: Record<string, unknown> | null = null

  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === '' || /^\s*#/.test(line)) continue
    const indent = line.length - line.trimStart().length
    const pair = line.trim().match(/^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/)
    if (!pair) continue
    const [, key, rawValue] = pair
    const value = stripQuotes(rawValue.trim())

    if (indent === 0) {
      currentKey = key
      currentMap = null
      nestedKey = null
      nestedMap = null
      if (value === '') {
        currentMap = {}
        root[key] = currentMap
      } else {
        root[key] = value
      }
      continue
    }

    if (currentMap === null) continue

    if (indent === 2) {
      nestedKey = key
      if (value === '') {
        nestedMap = {}
        currentMap[key] = nestedMap
      } else {
        currentMap[key] = value
        nestedMap = null
      }
      continue
    }

    if (indent >= 4 && nestedMap !== null && nestedKey !== null) {
      nestedMap[key] = value
    }
  }

  void currentKey
  return root
}

function stripQuotes(value: string): string {
  const quoted = value.match(/^(['"])([\s\S]*)\1$/)
  return quoted ? quoted[2] : value
}

function asBoolean(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toLowerCase() === 'true'
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

// ─── Reading ──────────────────────────────────────────────────────────────────

/**
 * Read an engineering.md into a typed artefact, or refuse it.
 *
 * Refuses — rather than degrading — when the document is not an
 * engineering-requirements artefact, is missing its spec binding, omits any of
 * the ten categories, carries an illegal state, or is BLOCKED. The gate's own
 * words: blocking findings must be resolved before this spec becomes code.
 */
export function readEngineeringArtifact(raw: string): EngineeringArtifact {
  const meta = parseFrontmatter(raw)
  const reasons: string[] = []

  if (asString(meta.type) !== 'engineering-requirements') {
    reasons.push('frontmatter `type` is not engineering-requirements')
  }

  const spec = asString(meta.spec)
  const specSha256 = asString(meta.spec_sha256)
  if (!spec) reasons.push('frontmatter is missing `spec`')
  if (!specSha256) reasons.push('frontmatter is missing `spec_sha256`')

  const rawCategories = meta.categories
  const categories: Partial<Record<EngineeringCategory, CategoryEntry>> = {}

  if (rawCategories === null || typeof rawCategories !== 'object') {
    reasons.push('frontmatter is missing a `categories` mapping')
  } else {
    const map = rawCategories as Record<string, unknown>
    for (const extra of Object.keys(map).filter(
      (name) => !ENGINEERING_CATEGORIES.includes(name as EngineeringCategory),
    )) {
      reasons.push(`unknown category \`${extra}\``)
    }

    for (const name of ENGINEERING_CATEGORIES) {
      const entry = map[name]
      if (entry === undefined) {
        reasons.push(`category \`${name}\` is missing — all ten are required`)
        continue
      }
      if (entry === null || typeof entry !== 'object') {
        reasons.push(`category \`${name}\` is not a mapping`)
        continue
      }
      const fields = entry as Record<string, unknown>
      const state = asString(fields.state).toUpperCase()
      if (!LEGAL_STATES.includes(state as CategoryState)) {
        reasons.push(
          `category \`${name}\` has illegal state \`${state || 'unset'}\` ` +
            `(legal: ${LEGAL_STATES.join(', ')})`,
        )
        continue
      }
      categories[name] = {
        state: state as CategoryState,
        blocking: asBoolean(fields.blocking),
        answer: asString(fields.answer),
      }
    }
  }

  const blocking = Object.entries(categories)
    .filter(([, entry]) => entry?.blocking)
    .map(([name]) => name)

  // `status` is DERIVED by the gate, not chosen. Recomputing it here means a
  // document that mislabels itself PASS while carrying a blocking finding is
  // refused on the finding, not admitted on the label.
  const derivedStatus: 'PASS' | 'BLOCKED' = blocking.length > 0 ? 'BLOCKED' : 'PASS'
  const declaredStatus = asString(meta.status).toUpperCase()
  if (declaredStatus && declaredStatus !== derivedStatus) {
    reasons.push(
      `\`status\` is ${declaredStatus} but ${blocking.length} categories carry ` +
        `blocking: true — status is derived, not chosen; it must be ${derivedStatus}`,
    )
  }
  if (blocking.length > 0) {
    reasons.push(
      'blocking findings must be resolved before this spec becomes code: ' +
        blocking.sort().map((name) => `\`${name}\``).join(', '),
    )
  }

  if (reasons.length > 0) throw new EngineeringIngestRefusal(reasons)

  return {
    spec,
    specSha256,
    status: derivedStatus,
    categories: categories as Record<EngineeringCategory, CategoryEntry>,
  }
}

// ─── Planning ─────────────────────────────────────────────────────────────────

/**
 * Map a reviewed artefact to the ordered step plan `decomposeApprovedIdea` takes.
 *
 * One step per category in a work-generating state, in fixed implementation
 * order. DEFERRED and N/A contribute nothing.
 *
 * A reviewed artefact whose every category is DEFERRED/N/A yields an EMPTY plan,
 * and that is a legitimate outcome — but the caller must not treat it as
 * "nothing to do" without saying so, which is why `planFromEngineering` reports
 * the counts rather than returning a bare array.
 */
export interface EngineeringPlan {
  steps: DecompositionStep[]
  /** Categories that produced a step. */
  planned: EngineeringCategory[]
  /** Categories deliberately skipped, with the state that skipped them. */
  skipped: Array<{ category: EngineeringCategory; state: CategoryState }>
  /** The spec this plan is bound to, carried through for provenance. */
  spec: string
  specSha256: string
}

export function planFromEngineering(artifact: EngineeringArtifact): EngineeringPlan {
  const steps: DecompositionStep[] = []
  const planned: EngineeringCategory[] = []
  const skipped: Array<{ category: EngineeringCategory; state: CategoryState }> = []

  for (const category of CATEGORY_ORDER) {
    const entry = artifact.categories[category]
    if (!WORK_GENERATING_STATES.has(entry.state)) {
      skipped.push({ category, state: entry.state })
      continue
    }
    planned.push(category)
    steps.push({
      title: `${CATEGORY_LABEL[category]}: ${artifact.spec}`,
      // The reviewer's own answer is the objective. Where the document gave
      // none, say so plainly rather than inventing an objective — a fabricated
      // instruction is worse than an explicit gap.
      objective:
        entry.answer ||
        `${CATEGORY_LABEL[category]} was ${entry.state} for ${artifact.spec}, but the review recorded no answer. Resolve before implementing.`,
      riskLevel: CATEGORY_RISK[category],
    })
  }

  return { steps, planned, skipped, spec: artifact.spec, specSha256: artifact.specSha256 }
}

/** Convenience: raw document to plan, refusing anything unreviewed or blocked. */
export function ingestEngineering(raw: string): EngineeringPlan {
  return planFromEngineering(readEngineeringArtifact(raw))
}
