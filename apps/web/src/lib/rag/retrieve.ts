// src/lib/rag/retrieve.ts
// Business-scoped RAG retrieval: embed the query, then call the
// `match_business_docs` RPC (supabase/migrations/20260713120000_match_business_docs.sql),
// which cosine-searches `nexus_pages` rows for one business.
//
// The RPC is SECURITY INVOKER, so the caller's RLS applies — pass a server-side
// client (route handlers already founder-scope via getUser()).

import type { SupabaseClient } from '@supabase/supabase-js';
import { embed } from './embed';

export interface RetrievedChunk {
  content: string;
  source: string | null;
  similarity: number;
}

interface MatchBusinessDocsRow {
  id: string;
  title: string | null;
  content: string | null;
  similarity: number;
}

export async function retrieve(
  supabase: SupabaseClient,
  businessId: string,
  query: string,
  k = 5,
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embed(query);

  const { data, error } = await supabase.rpc('match_business_docs', {
    p_business_id: businessId,
    query_embedding: queryEmbedding,
    match_count: k,
  });
  if (error) {
    throw new Error(`[rag] match_business_docs failed: ${error.message}`);
  }

  return ((data ?? []) as MatchBusinessDocsRow[]).map((row) => ({
    content: extractText(row.content) || row.title || '',
    source: row.title ?? null,
    similarity: row.similarity,
  }));
}

// nexus_pages.body is a JSONB block document; the RPC returns it as `body::text`.
// Pull out the human-readable strings (every `text` field, the Tiptap/Notion-block
// idiom) so the chat lane gets prose, not JSON syntax. Non-JSON content passes through.
function extractText(raw: string | null): string {
  if (!raw) return '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw.trim();
  }
  if (typeof parsed === 'string') return parsed.trim();
  const parts: string[] = [];
  collectTextFields(parsed, parts);
  return parts.join(' ').trim();
}

function collectTextFields(node: unknown, parts: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectTextFields(item, parts);
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'text' && typeof value === 'string') {
        parts.push(value);
      } else {
        collectTextFields(value, parts);
      }
    }
  }
}
