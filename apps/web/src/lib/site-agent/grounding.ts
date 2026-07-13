// src/lib/site-agent/grounding.ts
// Grounding for the public site chat agent (UNI-2359).
//
// Preferred path: semantic retrieval via `@/lib/rag/retrieve` (UNI-2358, built
// on a sibling branch), which is scoped to a resolved business id and only
// returns founder-curated, embedded content. Until that module lands, grounding
// degrades to the PUBLIC business profile only (name + description from the
// `businesses` row).
//
// SECURITY (anonymous surface): the fallback deliberately does NOT read
// `nexus_pages` — that table is the founder's internal Notion-like workspace
// with no publication gate (no `is_published` column on the live schema), so
// surfacing it to anonymous visitors would leak private notes. Grounding also
// FAILS CLOSED: if the business key does not resolve to exactly one business,
// no snippets are returned (never founder-wide). The result carries an explicit
// `source` discriminator (rag | keyword | none) per the real-vs-mock invariant.

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

/**
 * Public-safe fallback: the business's own profile (name + description) from the
 * `businesses` row. Never reads internal `nexus_pages`. Assumes `business` is a
 * resolved row — the caller fails closed before reaching here.
 */
function businessProfileSnippets(business: BusinessRow): GroundingSnippet[] {
  if (!business.description) return []
  return [
    {
      content: `${business.name ?? 'About'}: ${business.description}`.slice(0, MAX_SNIPPET_CHARS),
      source: 'business_profile',
      similarity: 0,
    },
  ]
}

/**
 * Ground a visitor query in business content.
 * Tries UNI-2358 semantic retrieval first; falls back to the public business
 * profile. FAILS CLOSED: an unresolved business key returns no snippets rather
 * than any founder-wide content.
 */
export async function ground(
  supabase: SupabaseClient,
  founderId: string,
  businessKey: string,
  query: string,
  k = 5,
): Promise<GroundingResult> {
  const business = await resolveBusiness(supabase, founderId, businessKey).catch(() => null)

  // Fail closed: without a resolved business we cannot scope grounding, so we
  // ground on nothing rather than risk cross-business or founder-wide exposure.
  if (!business?.id) {
    return { snippets: [], source: 'none', businessName: null }
  }

  const rag = await loadRagModule()
  if (rag) {
    try {
      const snippets = await rag.retrieve(supabase, business.id, query, k)
      if (snippets.length > 0) return { snippets, source: 'rag', businessName: business.name }
    } catch {
      // Fall through to the profile fallback — degraded, never fatal.
    }
  }

  const snippets = businessProfileSnippets(business)
  return {
    snippets,
    source: snippets.length > 0 ? 'keyword' : 'none',
    businessName: business.name,
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
