// src/lib/content/quality-gate.ts
// POET content quality gate — evaluates generated content before it enters the publishing queue.
// POET framework: Purpose, Opinion/perspective, Experience/evidence, Trust signals.
// Runs as a fast heuristic pass (string analysis only — no LLM call) so it adds minimal latency.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface POETScore {
  purpose: { score: number; note: string }      // 0–25: clear goal, defined audience
  opinion: { score: number; note: string }       // 0–25: unique POV, not generic
  experience: { score: number; note: string }    // 0–25: specific evidence, stats, examples
  trust: { score: number; note: string }         // 0–25: credible, no hallucinated facts
  total: number                                   // 0–100
  pass: boolean                                   // total >= 65
  failReasons: string[]
}

export interface ContentQualityInput {
  content: string
  contentType: 'social_post' | 'blog_intro' | 'email_campaign' | 'video_script' | 'thread'
  topic: string
  targetAudience?: string
}

// Google-indexing survival factors (derived from April 2026 helpful-content purge analysis).
export interface SurvivalCheck {
  hasUniqueInsight: boolean
  hasAuthorshipSignal: boolean
  hasEngagementHook: boolean
  pass: boolean
  issues: string[]
}

// ── Heuristic helpers ──────────────────────────────────────────────────────────

/** True if the string contains a match for any of the supplied patterns. */
function matchesAny(text: string, patterns: (string | RegExp)[]): boolean {
  const lower = text.toLowerCase()
  return patterns.some((p) =>
    typeof p === 'string' ? lower.includes(p) : p.test(lower)
  )
}

/** Count how many patterns match (used for graduated scoring). */
function countMatches(text: string, patterns: (string | RegExp)[]): number {
  const lower = text.toLowerCase()
  return patterns.filter((p) =>
    typeof p === 'string' ? lower.includes(p) : p.test(lower)
  ).length
}

// ── Purpose scorer (0–25) ──────────────────────────────────────────────────────
// Checks for: clear CTA, audience-specific language, defined goal signals.

const CTA_PATTERNS: (string | RegExp)[] = [
  'click', 'visit', 'book', 'call us', 'contact', 'sign up', 'subscribe',
  'download', 'learn more', 'get started', 'try', 'shop', 'order', 'dm us',
  'link in bio', 'tap the link', 'swipe up', 'follow',
]

const AUDIENCE_PATTERNS: (string | RegExp)[] = [
  'business owner', 'tradesperson', 'entrepreneur', 'homeowner', 'property',
  'australian', 'small business', 'startup', 'professional', 'client',
  'customer', 'you\'re a', 'if you', 'for you', 'your business', 'your team',
]

const GOAL_PATTERNS: (string | RegExp)[] = [
  'to help', 'to save', 'to grow', 'to improve', 'to boost', 'to reduce',
  'so you can', 'which means', 'that\'s why', 'the goal is', 'our aim',
]

function scorePurpose(content: string): { score: number; note: string } {
  let score = 0
  const notes: string[] = []

  const ctaCount = countMatches(content, CTA_PATTERNS)
  if (ctaCount >= 1) {
    score += 10
    notes.push('CTA present')
  } else {
    notes.push('no CTA detected')
  }

  const audienceCount = countMatches(content, AUDIENCE_PATTERNS)
  if (audienceCount >= 2) {
    score += 10
    notes.push('audience-specific language')
  } else if (audienceCount === 1) {
    score += 5
    notes.push('minimal audience reference')
  } else {
    notes.push('no audience reference')
  }

  if (matchesAny(content, GOAL_PATTERNS)) {
    score += 5
    notes.push('goal articulated')
  }

  return { score: Math.min(score, 25), note: notes.join('; ') }
}

// ── Opinion scorer (0–25) ──────────────────────────────────────────────────────
// Checks for: first-person perspective, contrarian signals, unique framing.

const FIRST_PERSON_PATTERNS: RegExp[] = [
  /\bi\b/, /\bwe\b/, /\bour\b/, /\bmy\b/, /\bi've\b/, /\bwe've\b/,
  /\bi think\b/, /\bwe believe\b/, /\bin our (view|experience|opinion)\b/,
]

const CONTRARIAN_PATTERNS: (string | RegExp)[] = [
  'most people don\'t', 'contrary to', 'despite what', 'the truth is',
  'actually', 'here\'s the thing', 'unpopular opinion', 'hot take',
  'what nobody tells you', 'stop doing', 'wrong way', 'myth', 'mistake',
]

const UNIQUE_FRAMING_PATTERNS: (string | RegExp)[] = [
  'our approach', 'the way we', 'what makes us', 'the difference',
  'unlike other', 'what sets', 'our philosophy', 'we believe',
]

function scoreOpinion(content: string): { score: number; note: string } {
  let score = 0
  const notes: string[] = []

  const fpCount = countMatches(content, FIRST_PERSON_PATTERNS)
  if (fpCount >= 3) {
    score += 10
    notes.push('strong first-person voice')
  } else if (fpCount >= 1) {
    score += 6
    notes.push('some first-person voice')
  } else {
    notes.push('no first-person voice (sounds generic)')
  }

  if (matchesAny(content, CONTRARIAN_PATTERNS)) {
    score += 8
    notes.push('contrarian framing present')
  }

  if (matchesAny(content, UNIQUE_FRAMING_PATTERNS)) {
    score += 7
    notes.push('unique positioning signal')
  }

  return { score: Math.min(score, 25), note: notes.join('; ') }
}

// ── Experience scorer (0–25) ───────────────────────────────────────────────────
// Checks for: numbers/stats, specific examples, discovery language.

const NUMBERS_PATTERN = /\b\d[\d,]*(\.\d+)?(%|x|\+|k|m|b)?\b/i

const EXAMPLE_PATTERNS: (string | RegExp)[] = [
  'for example', 'for instance', 'such as', 'like when', 'case study',
  'client story', 'we helped', 'one of our', 'last month', 'last year',
  'recently', 'in 2024', 'in 2025', 'in 2026',
]

const DISCOVERY_PATTERNS: (string | RegExp)[] = [
  'i tested', 'we tested', 'i found', 'we found', 'i discovered',
  'we discovered', 'i learned', 'we learned', 'after trying', 'the results',
  'what we saw', 'data shows', 'we measured',
]

function scoreExperience(content: string): { score: number; note: string } {
  let score = 0
  const notes: string[] = []

  // Count distinct number occurrences as a proxy for data richness
  const numberMatches = content.match(new RegExp(NUMBERS_PATTERN.source, 'gi'))
  const numberCount = numberMatches ? numberMatches.length : 0
  if (numberCount >= 3) {
    score += 10
    notes.push(`${numberCount} data points / stats`)
  } else if (numberCount >= 1) {
    score += 5
    notes.push(`${numberCount} number(s) cited`)
  } else {
    notes.push('no numbers or stats')
  }

  if (matchesAny(content, EXAMPLE_PATTERNS)) {
    score += 8
    notes.push('specific example referenced')
  }

  if (matchesAny(content, DISCOVERY_PATTERNS)) {
    score += 7
    notes.push('evidence / discovery language present')
  }

  return { score: Math.min(score, 25), note: notes.join('; ') }
}

// ── Trust scorer (0–25) ────────────────────────────────────────────────────────
// Checks for: source attribution, absence of vague authority claims, absence of unverifiable generics.

const VAGUE_AUTHORITY_PATTERNS: (string | RegExp)[] = [
  'experts say', 'experts believe', 'studies show', 'research shows',
  'scientists say', 'doctors say', 'according to experts',
  'everyone knows', 'it\'s well known', 'research proves',
]

const UNVERIFIABLE_PATTERNS: (string | RegExp)[] = [
  'millions of', 'billions of', '#1 in the world', 'best in the world',
  'the only', 'guaranteed results', '100% success',
]

const SOURCE_PATTERNS: (string | RegExp)[] = [
  'according to', 'source:', 'via ', 'reported by', 'as published',
  'from our', 'our data', 'our experience', 'our team', 'we\'ve found',
]

function scoreTrust(content: string): { score: number; note: string } {
  let score = 25 // Start full — deduct for red flags
  const notes: string[] = []

  const vagueCount = countMatches(content, VAGUE_AUTHORITY_PATTERNS)
  if (vagueCount >= 2) {
    score -= 10
    notes.push(`${vagueCount} vague authority claims detected`)
  } else if (vagueCount === 1) {
    score -= 5
    notes.push('1 vague authority claim detected')
  }

  const unverifiableCount = countMatches(content, UNVERIFIABLE_PATTERNS)
  if (unverifiableCount >= 1) {
    score -= 8
    notes.push(`${unverifiableCount} unverifiable superlative(s) detected`)
  }

  if (matchesAny(content, SOURCE_PATTERNS)) {
    score += 3 // Small bonus for cited source
    notes.push('source / attribution signal present')
  }

  if (notes.length === 0) {
    notes.push('no red flags detected')
  }

  return { score: Math.max(0, Math.min(score, 25)), note: notes.join('; ') }
}

// ── Main POET scorer ───────────────────────────────────────────────────────────

/**
 * Score content against the POET framework using fast heuristic analysis.
 * No LLM call — suitable for inline use in the content pipeline.
 *
 * @param input - The generated content and its metadata
 * @returns A full POET score with breakdown and pass/fail verdict
 */
export async function scorePOET(input: ContentQualityInput): Promise<POETScore> {
  const { content } = input

  const purpose = scorePurpose(content)
  const opinion = scoreOpinion(content)
  const experience = scoreExperience(content)
  const trust = scoreTrust(content)

  const total = purpose.score + opinion.score + experience.score + trust.score
  const pass = total >= 65

  const failReasons: string[] = []
  if (!pass) {
    if (purpose.score < 10) failReasons.push(`Purpose too weak (${purpose.score}/25): ${purpose.note}`)
    if (opinion.score < 10) failReasons.push(`Opinion missing (${opinion.score}/25): ${opinion.note}`)
    if (experience.score < 10) failReasons.push(`No evidence cited (${experience.score}/25): ${experience.note}`)
    if (trust.score < 15) failReasons.push(`Trust issues (${trust.score}/25): ${trust.note}`)
    if (failReasons.length === 0) {
      failReasons.push(`Overall score too low (${total}/100) — improve across all dimensions`)
    }
  }

  return { purpose, opinion, experience, trust, total, pass, failReasons }
}

// ── Google survival check ──────────────────────────────────────────────────────

/**
 * Check whether content would survive a Google helpful-content review.
 * Based on the April 2026 purge analysis: three signals that distinguish
 * content that ranked from content that was deindexed.
 *
 * @param content - Raw content string to evaluate
 */
export function checkSurvivalFactors(content: string): SurvivalCheck {
  const issues: string[] = []

  // 1. Unique insight — has a specific claim rather than AI-is-changing-everything filler
  const GENERIC_FILLER: (string | RegExp)[] = [
    'ai is changing everything', 'the future is', 'in today\'s fast-paced',
    'in the digital age', 'leverage the power of', 'unlock your potential',
    'game-changer', 'disruptive', 'synergy', 'paradigm shift',
  ]
  // Content qualifies if it has a specific number, example, or discovery language AND
  // does NOT consist primarily of generic filler.
  const fillerCount = countMatches(content, GENERIC_FILLER)
  const hasSpecificClaim =
    NUMBERS_PATTERN.test(content) ||
    matchesAny(content, EXAMPLE_PATTERNS) ||
    matchesAny(content, DISCOVERY_PATTERNS)
  const hasUniqueInsight = hasSpecificClaim && fillerCount < 2
  if (!hasUniqueInsight) {
    issues.push(
      fillerCount >= 2
        ? 'Too much generic filler — add a specific claim, stat, or example'
        : 'No unique insight detected — add a specific claim, stat, or example'
    )
  }

  // 2. Authorship signal — "I", "we", "at [word]", or a named perspective
  const AUTHORSHIP_PATTERNS: RegExp[] = [
    /\bi\b/i,
    /\bwe\b/i,
    /\bat [a-z]+/i,    // "at Synthex", "at our studio", etc.
    /[A-Z][a-z]+ says/,  // Named person attribution
  ]
  const hasAuthorshipSignal = AUTHORSHIP_PATTERNS.some((p) => p.test(content))
  if (!hasAuthorshipSignal) {
    issues.push('No authorship signal — add "I", "we", "at [company]", or a named perspective')
  }

  // 3. Engagement hook — first 50 characters contain a question, strong stat, or direct claim
  const hook = content.slice(0, 50)
  const hasEngagementHook =
    hook.includes('?') ||             // question
    /\b\d/.test(hook) ||              // stat / number right up front
    /[A-Z]{2}/.test(hook) ||          // shouted word / strong emphasis
    /^(why|how|what|the|stop|if|are|is|do|can)/i.test(hook.trim()) // direct opener
  if (!hasEngagementHook) {
    issues.push(
      'Weak opening hook — first 50 characters should contain a question, stat, or direct claim'
    )
  }

  return {
    hasUniqueInsight,
    hasAuthorshipSignal,
    hasEngagementHook,
    pass: issues.length === 0,
    issues,
  }
}
