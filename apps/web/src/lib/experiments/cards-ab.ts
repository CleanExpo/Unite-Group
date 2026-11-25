// UNI-3293: the /cards 50/50 experiment, product-first explainer (B) against the current showroom (A).
// Dependency-free so it ships in the client bundle. It carries no participant identifier: assignment is a pure
// function of the tracker's existing random per-tab session id, and the only thing that goes on the wire is the
// experiment key and the arm, written into the existing site_events label (no new table, no migration).

export const CARDS_AB_EXPERIMENT = 'cards_ab_v1'
export type CardsVariant = 'A' | 'B'

/** Label limit of POST /api/events (SITE_EVENT_LIMITS.label). Kept here so this file stays import-free. */
const LABEL_MAX = 120

/** The experiment ships dark: nothing is assigned, tagged or swapped until the flag is '1'. */
export function cardsAbEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CARDS_AB_ENABLED === '1'
}

/** FNV-1a (32-bit) followed by the murmur3 finaliser, so near-identical ids still split evenly. */
function hash32(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

/** Deterministic 50/50: the same participant and experiment always give the same arm. */
export function assignVariant(participantId: string, experiment: string = CARDS_AB_EXPERIMENT): CardsVariant {
  return hash32(`${experiment}:${participantId}`) % 2 === 0 ? 'A' : 'B'
}

const SUFFIX = /(?:^|\|)x=([a-z0-9_]+)\|v=([AB])$/

/** `base|x=<experiment>|v=<arm>`; the base is cut first so the arm is never lost to the length limit. */
export function tagLabel(base: string, variant: CardsVariant, experiment: string = CARDS_AB_EXPERIMENT): string {
  const suffix = `x=${experiment}|v=${variant}`
  if (!base) return suffix
  return `${base.slice(0, LABEL_MAX - suffix.length - 1)}|${suffix}`
}

export function parseVariantLabel(label: string | null | undefined): { base: string; experiment: string; variant: CardsVariant } | null {
  const m = typeof label === 'string' ? SUFFIX.exec(label) : null
  if (!m) return null
  return { base: label!.slice(0, m.index), experiment: m[1], variant: m[2] as CardsVariant }
}

/**
 * Sample ratio mismatch: a chi-square test of the two arm counts against 50/50, one degree of freedom.
 * 10.83 is the critical value at p = 0.001, the usual alarm level. With an empty arm the answer is unknown
 * (null), never "no mismatch".
 */
export function srmCheck(countA: number, countB: number): { chiSquare: number | null; mismatch: boolean | null } {
  const total = countA + countB
  // Anything that is not a pair of positive whole counts is unknown, never a clean split.
  if (!Number.isSafeInteger(countA) || !Number.isSafeInteger(countB) || countA <= 0 || countB <= 0) {
    return { chiSquare: null, mismatch: null }
  }
  const expected = total / 2
  const chiSquare = (countA - expected) ** 2 / expected + (countB - expected) ** 2 / expected
  return { chiSquare, mismatch: chiSquare > 10.83 }
}
