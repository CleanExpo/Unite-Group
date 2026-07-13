// src/lib/site-agent/grounding.ts
// Grounding for the public site chat agent (UNI-2359).
//
// Preferred path: semantic retrieval via `@/lib/rag/retrieve` (UNI-2358, built
// on a sibling branch). Until that module lands, the dynamic import rejects and
// grounding degrades to a keyword (ilike) lookup over `nexus_pages`, scoped to
// the founder + business. The result carries an explicit `source` discriminator
// (rag | keyword | none) per the integrations real-vs-mock invariant — callers
// must never present degraded grounding as semantic retrieval.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface GroundingSnippet {
  content: string
  source: string | null
  similarity: number
}

export interface GroundingResult {
  snippets: GroundingSnippet[]
  source: 'rag' | 'keyword' | 'none'
  businessName: string | null
}

interface RetrieveModule {
  retrieve: (
    supabase: SupabaseClient,
    businessId: string,
    query: string,
    k?: number,
  ) => Promise<GroundingSnippet[]>
}

const MAX_SNIPPET_CHARS = 1500

// INTEGRATION POINT (UNI-2358): `@/lib/rag/retrieve` is built on a sibling
// branch and does not exist here, so the import carries webpackIgnore /
// turbopackIgnore — the bundler leaves it as a native dynamic import (a plain
// literal import() of a missing module is a hard Turbopack build error). A
// native import cannot resolve the `@/` alias at runtime, so it rejects and
// grounding uses the keyword fallback. ONCE UNI-2358 LANDS, delete the three
// ignore comments so the bundler links the real module and semantic retrieval
// activates. Until then the degradation is explicit: GroundingResult.source
// stays 'keyword'/'none' and /api/agent surfaces it as X-Grounding-Source.
async function loadRagModule(): Promise<RetrieveModule | null> {
  const mod: RetrieveModule | null = await import(
    /* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ '@/lib/rag/retrieve'
  ).catch(() => null)
  if (mod && typeof mod.retrieve === 'function') return mod
  return null
}

interface BusinessRow {
  id: string
  name: string | null
  description: string | null
}

/** site_keys stores the business key (slug); nexus data is scoped by business id. */
async function resolveBusiness(
  supabase: SupabaseClient,
  founderId: string,
  businessKey: string,
): Promise<BusinessRow | null> {
  const { data } = await supabase
    .from('businesses')
    .select('id, name, description')
    .eq('founder_id', founderId)
    .eq('slug', businessKey)
    .maybeSingle()
  return (data as BusinessRow | null) ?? null
}

/** Extract search terms from the visitor query, sanitised for PostgREST filters. */
function extractTerms(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 3),
    ),
  ).slice(0, 5)
}

/** Flatten a nexus_pages JSONB doc (`{type, text, content: [...]}`) to plain text. */
function extractText(node: unknown): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(extractText).filter(Boolean).join(' ')
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>
    const own = typeof record.text === 'string' ? record.text : ''
    const children = extractText(record.content)
    return [own, children].filter(Boolean).join(' ')
  }
  return ''
}

async function keywordFallback(
  supabase: SupabaseClient,
  founderId: string,
  business: BusinessRow | null,
  query: string,
  k: number,
): Promise<GroundingSnippet[]> {
  const snippets: GroundingSnippet[] = []

  if (business?.description) {
    snippets.push({
      content: `${business.name ?? 'About'}: ${business.description}`.slice(0, MAX_SNIPPET_CHARS),
      source: 'business_profile',
      similarity: 0,
    })
  }

  const terms = extractTerms(query)
  let pages = supabase
    .from('nexus_pages')
    .select('title, content')
    .eq('founder_id', founderId)
    .limit(k)
  if (business?.id) pages = pages.eq('business_id', business.id)
  if (terms.length > 0) {
    pages = pages.or(terms.map((term) => `title.ilike.%${term}%`).join(','))
  }

  const { data } = await pages
  for (const page of (data as Array<{ title: string | null; content: unknown }> | null) ?? []) {
    const text = extractText(page.content).trim()
    if (!text && !page.title) continue
    snippets.push({
      content: `${page.title ?? 'Untitled'}: ${text}`.slice(0, MAX_SNIPPET_CHARS),
      source: page.title,
      similarity: 0,
    })
  }

  return snippets.slice(0, k + 1)
}

/**
 * Ground a visitor query in business content.
 * Tries UNI-2358 semantic retrieval first; falls back to keyword lookup when
 * the rag module is absent (this branch) or throws at runtime.
 */
export async function ground(
  supabase: SupabaseClient,
  founderId: string,
  businessKey: string,
  query: string,
  k = 5,
): Promise<GroundingResult> {
  const business = await resolveBusiness(supabase, founderId, businessKey).catch(() => null)

  const rag = await loadRagModule()
  if (rag && business?.id) {
    try {
      const snippets = await rag.retrieve(supabase, business.id, query, k)
      if (snippets.length > 0) return { snippets, source: 'rag', businessName: business.name }
    } catch {
      // Fall through to the keyword path — degraded, never fatal.
    }
  }

  const snippets = await keywordFallback(supabase, founderId, business, query, k).catch(
    () => [] as GroundingSnippet[],
  )
  return {
    snippets,
    source: snippets.length > 0 ? 'keyword' : 'none',
    businessName: business?.name ?? null,
  }
}

/** Render snippets as a compact context block for the system prompt. */
export function formatGroundingContext(snippets: GroundingSnippet[]): string {
  return snippets
    .map((snippet, index) => {
      const label = snippet.source ? ` (${snippet.source})` : ''
      return `[${index + 1}]${label} ${snippet.content}`
    })
    .join('\n')
}
