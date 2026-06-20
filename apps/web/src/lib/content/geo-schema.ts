// src/lib/content/geo-schema.ts
// GEO structured data generator
// Produces schema.org JSON-LD for AI search engine citation optimisation.
//
// GEO (Generative Engine Optimisation) targets AI search surfaces:
// ChatGPT browsing, Perplexity, Google AI Overviews, Bing Copilot.
// These engines prefer content with clear attribution, structured Q&A,
// and entity-rich schema markup they can confidently cite.

export interface GeoMetadata {
  title: string
  description: string
  author: string          // brand/person name
  organisation?: string
  datePublished: string   // ISO 8601
  url?: string
  topics: string[]        // key entities/topics in the content
}

// ── Article Schema ───────────────────────────────────────────────────────────

/**
 * Generates Article schema.org JSON-LD.
 * Produces a stringified JSON-LD script block ready for insertion into <head>.
 */
export function generateArticleSchema(content: string, meta: GeoMetadata): string {
  const wordCount = content.trim().split(/\s+/).length

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.title,
    description: meta.description,
    author: {
      '@type': meta.organisation ? 'Person' : 'Person',
      name: meta.author,
      ...(meta.organisation ? { worksFor: { '@type': 'Organisation', name: meta.organisation } } : {}),
    },
    ...(meta.organisation
      ? { publisher: { '@type': 'Organisation', name: meta.organisation } }
      : {}),
    datePublished: meta.datePublished,
    dateModified: meta.datePublished,
    ...(meta.url ? { url: meta.url, mainEntityOfPage: { '@type': 'WebPage', '@id': meta.url } } : {}),
    wordCount,
    ...(meta.topics.length > 0 ? { keywords: meta.topics.join(', ') } : {}),
    inLanguage: 'en-AU',
  }

  return JSON.stringify(schema, null, 2)
}

// ── FAQ Schema ───────────────────────────────────────────────────────────────

/**
 * Generates FAQPage schema from content.
 * Extracts Q&A pairs by finding sentences ending in "?" and taking the
 * following paragraph as the answer.
 *
 * Returns null (as empty string) when fewer than 2 Q&A pairs are found —
 * Google requires at least 2 FAQ items for rich result eligibility.
 */
export function generateFAQSchema(content: string, meta: GeoMetadata): string {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)

  const pairs: Array<{ question: string; answer: string }> = []

  for (let i = 0; i < paragraphs.length - 1; i++) {
    const paragraph = paragraphs[i]

    // A paragraph is a "question paragraph" if it contains a sentence ending in "?"
    // and is short enough to plausibly be a question heading (< 200 chars)
    const questionMatch = paragraph.match(/([^.!?]*\?)/u)
    if (questionMatch && paragraph.length < 200) {
      const question = questionMatch[1].trim()
      const answer = paragraphs[i + 1]

      // Skip trivial or empty answers
      if (answer && answer.length > 20) {
        pairs.push({ question, answer })
      }
    }
  }

  if (pairs.length < 2) {
    return ''
  }

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    name: meta.title,
    author: {
      '@type': 'Person',
      name: meta.author,
      ...(meta.organisation ? { worksFor: { '@type': 'Organisation', name: meta.organisation } } : {}),
    },
    mainEntity: pairs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  }

  return JSON.stringify(schema, null, 2)
}

// ── AI Snippet ───────────────────────────────────────────────────────────────

/**
 * Generates a GEO-optimised AI snippet for citation by AI search engines.
 *
 * Finds the first 3 sentences that mention the topic keyword, then
 * reformats each as "According to [author], [factual claim]."
 *
 * If fewer than 3 topic-containing sentences exist, falls back to the
 * first 3 sentences of the content overall.
 */
export function generateAISnippet(content: string, topic: string): string {
  // Split into sentences — handles ., !, ? followed by whitespace or end
  const allSentences = content
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)

  const topicLower = topic.toLowerCase()
  const topicSentences = allSentences.filter((s) =>
    s.toLowerCase().includes(topicLower)
  )

  // Use topic-matching sentences; fall back to opening sentences
  const candidates = topicSentences.length >= 2 ? topicSentences : allSentences
  const selected = candidates.slice(0, 3)

  if (selected.length === 0) {
    return ''
  }

  // Strip leading "I", "We", "Our" — rephrase into third-person citation form
  const cited = selected.map((sentence) => {
    // Remove leading personal pronouns so the citation reads naturally
    const cleaned = sentence
      .replace(/^(I|We|Our|My)\s+/i, '')
      .replace(/^[a-z]/, (c) => c.toUpperCase())

    return `According to ${topic}, ${cleaned.endsWith('.') ? cleaned : cleaned + '.'}`
  })

  return cited.join(' ')
}

// ── GEO Package ─────────────────────────────────────────────────────────────

/**
 * Wraps content in GEO-optimal format for blog/web publishing.
 * Returns the JSON-LD article schema, an AI snippet, and (optionally)
 * a FAQPage schema when sufficient Q&A structure is detected.
 */
export function packageForGEO(
  content: string,
  meta: GeoMetadata
): { jsonLd: string; aiSnippet: string; faqSchema?: string } {
  const jsonLd = generateArticleSchema(content, meta)

  const primaryTopic = meta.topics[0] ?? meta.author
  const aiSnippet = generateAISnippet(content, primaryTopic)

  const faqRaw = generateFAQSchema(content, meta)
  const faqSchema = faqRaw.length > 0 ? faqRaw : undefined

  return { jsonLd, aiSnippet, ...(faqSchema ? { faqSchema } : {}) }
}
