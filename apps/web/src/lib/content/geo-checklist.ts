// src/lib/content/geo-checklist.ts
// GEO/AEO content survival checklist.
//
// Based on analysis of the Google April 2026 index purge, which removed ~45% of
// thin/derivative content from AI Overview eligibility. The three survival axes are:
//   1. Google survival factors  — original insight, specific evidence, direct answer
//   2. GEO citation factors     — schema markup, entity authority, citable format
//   3. AEO (Answer Engine Opt.) — Q&A format, term definitions
//
// Each factor is boolean (detected via heuristics) and worth 12.5 points.
// Perfect score = 100. Recommendations are generated for every failing factor.

export interface GEOChecklist {
  // Google survival factors
  hasOriginalInsight: boolean       // not just summarising others
  hasSpecificEvidence: boolean      // numbers, dates, named examples
  hasDirectAnswer: boolean          // first paragraph answers the intent
  // GEO citation factors
  hasSchemaMarkup: boolean          // JSON-LD present
  hasEntityAuthority: boolean       // author + org clearly attributed
  hasCitableFormat: boolean         // has a clear AI-extractable claim
  // AEO factors
  hasQuestionAnswer: boolean        // Q&A format present
  hasDefinition: boolean            // defines key terms
  // Score
  geoScore: number                  // 0–100 (8 factors × 12.5 each)
  recommendations: string[]
}

// ── Heuristic detectors ──────────────────────────────────────────────────────

/** Detects presence of specific numbers, statistics, or named examples. */
function detectSpecificEvidence(content: string): boolean {
  // Matches: percentages, dollar amounts, dates (YYYY or DD/MM/YY), or
  // sentences containing proper nouns followed by numbers
  return /\b\d{1,3}(%|,\d{3}|\.\d+)?\b/.test(content) ||
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/i.test(content) ||
    /\$[\d,]+(\.\d{2})?/.test(content) ||
    /\b\d{4}\b/.test(content)        // a standalone year counts as a date reference
}

/** Detects whether the opening paragraph (first ~300 chars) contains a direct answer. */
function detectDirectAnswer(content: string): boolean {
  const opening = content.slice(0, 300).toLowerCase()
  // A direct answer typically starts with a declarative claim or definition
  const directPatterns = [
    /^[^.!?]{10,}(is|are|means|refers to|describes|provides|enables|allows)/,
    /\b(the answer is|in short|in summary|to summarise|the key point|the main)/,
    /\b(defined as|also known as|also called|refers to)\b/,
  ]
  return directPatterns.some((pattern) => pattern.test(opening))
}

/** Detects original insight markers (first-person data, quotes, or unique claims). */
function detectOriginalInsight(content: string): boolean {
  const markers = [
    /\b(we found|our research|our analysis|our data|we tested|we surveyed|our experience)\b/i,
    /\b(according to our|based on our|in our)\b/i,
    /\b(for example|for instance|case study|real-world|in practice)\b/i,
    /\b(uniquely|specifically|exclusively|proprietary)\b/i,
    /"[^"]{20,}"/.test(content) && /\b(said|noted|explained|stated)\b/i.test(content) // attributed quote
      ? /"[^"]{20,}"/
      : null,
  ].filter(Boolean) as RegExp[]

  return markers.some((pattern) => pattern.test(content))
}

/** Detects entity authority signals (author name, organisation attribution). */
function detectEntityAuthority(content: string): boolean {
  // Looks for "By [Name]", "Author:", "Published by", or organisation mentions
  const authorPatterns = [
    /\bby\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/,   // "By Firstname Lastname"
    /\bauthor[:\s]+[A-Z]/i,
    /\bpublished by\b/i,
    /\b[A-Z][a-z]+\s+(Pty Ltd|Ltd|Inc|Group|Agency|Studio)\b/,
  ]
  return authorPatterns.some((p) => p.test(content))
}

/** Detects a citable claim — a sentence that states a clear, quotable fact. */
function detectCitableFormat(content: string): boolean {
  const sentences = content.split(/(?<=[.!?])\s+/)
  return sentences.some((s) => {
    const lower = s.toLowerCase()
    // A citable sentence contains a quantified or authoritative claim
    return (
      /\b\d+\s*%/.test(s) ||                       // "X% of..."
      /\b(according to|research shows|studies show|data shows|evidence suggests)\b/i.test(s) ||
      (s.length > 40 && s.length < 250 && /\b(is|are|was|were)\b/.test(lower) && /\d/.test(s))
    )
  })
}

/** Detects Q&A format — headings or lines ending in "?" followed by an answer. */
function detectQuestionAnswer(content: string): boolean {
  return /\?[\s\S]{20,300}(?=\n|\?|$)/.test(content) ||
    /^#+\s*[^.!]+\?/m.test(content)   // markdown heading ending in "?"
}

/** Detects whether key terms are defined within the content. */
function detectDefinition(content: string): boolean {
  return /\b(is defined as|refers to|also known as|also called|means that|is a type of|is an? )\b/i.test(content)
}

// ── Recommendation generator ─────────────────────────────────────────────────

function buildRecommendations(checklist: Omit<GEOChecklist, 'geoScore' | 'recommendations'>): string[] {
  const recs: string[] = []

  if (!checklist.hasOriginalInsight) {
    recs.push('Add original data, a first-hand case study, or a proprietary observation — AI engines strongly prefer content that is not purely derivative.')
  }
  if (!checklist.hasSpecificEvidence) {
    recs.push('Include specific numbers, percentages, named examples, or dates. Vague claims are rarely cited by AI Overviews.')
  }
  if (!checklist.hasDirectAnswer) {
    recs.push('Open with a direct, declarative answer in the first paragraph. AI engines extract the opening passage first.')
  }
  if (!checklist.hasSchemaMarkup) {
    recs.push('Add Article or FAQPage JSON-LD schema markup. Use generateArticleSchema() or packageForGEO() from geo-schema.ts.')
  }
  if (!checklist.hasEntityAuthority) {
    recs.push('Clearly attribute the content to an author and/or organisation. Include "By [Name]" or a Publisher field in the metadata.')
  }
  if (!checklist.hasCitableFormat) {
    recs.push('Include at least one short, quotable sentence with a concrete statistic or clearly attributed finding (under 250 characters).')
  }
  if (!checklist.hasQuestionAnswer) {
    recs.push('Add a Q&A section using the FAQ format (question heading followed by a direct answer paragraph) to qualify for FAQ rich results.')
  }
  if (!checklist.hasDefinition) {
    recs.push('Define the primary topic or key term early in the content using "X is defined as..." or "X refers to..." language.')
  }

  return recs
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Runs the GEO/AEO survival checklist against raw content.
 *
 * @param content    The full text content to evaluate (plain text or markdown).
 * @param hasSchema  Whether JSON-LD schema markup is already present on the page.
 * @returns          A GEOChecklist with a 0–100 score and prioritised recommendations.
 */
export function runGEOChecklist(content: string, hasSchema: boolean): GEOChecklist {
  const factors = {
    hasOriginalInsight:  detectOriginalInsight(content),
    hasSpecificEvidence: detectSpecificEvidence(content),
    hasDirectAnswer:     detectDirectAnswer(content),
    hasSchemaMarkup:     hasSchema,
    hasEntityAuthority:  detectEntityAuthority(content),
    hasCitableFormat:    detectCitableFormat(content),
    hasQuestionAnswer:   detectQuestionAnswer(content),
    hasDefinition:       detectDefinition(content),
  }

  const trueCount = Object.values(factors).filter(Boolean).length
  const geoScore = Math.round(trueCount * 12.5)

  const recommendations = buildRecommendations(factors)

  return {
    ...factors,
    geoScore,
    recommendations,
  }
}
