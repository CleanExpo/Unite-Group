#!/usr/bin/env tsx
/**
 * Pi-CEO Semantic Search Tool Wrapper
 * Exposes the Supabase semantic_search RPC as a first-class tool
 */

import { createClient } from '@supabase/supabase-js';

export interface SemanticSearchResult {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
  title: string;
  source_id: string;
  embedding_model: string;
}

export async function semanticSearch(
  queryEmbedding: number[],
  limit: number = 12,
  threshold: number = 0.78
): Promise<SemanticSearchResult[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.rpc('semantic_search', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_count: limit,
    similarity_threshold: threshold,
  });

  if (error) {
    console.error('semanticSearch RPC error:', error);
    return [];
  }

  return (data || []) as SemanticSearchResult[];
}

/**
 * Helper for Pi-CEO agents: search using plain text query
 * (embeds the query first, then calls semantic_search)
 */
export async function semanticSearchText(
  queryText: string,
  limit: number = 12,
  threshold: number = 0.78
): Promise<SemanticSearchResult[]> {
  // This would normally call an embedding model first
  // For now we assume the caller provides the embedding
  // Future: integrate with OpenAI embedding here
  console.warn('semanticSearchText requires pre-computed embedding. Use semanticSearch() directly for now.');
  return [];
}

export const semanticSearchTool = {
  name: 'semantic_search',
  description: 'Search the entire 2nd Brain + Nexus knowledge base using vector similarity. Returns ranked chunks with similarity scores.',
  parameters: {
    query_embedding: 'number[] (1536-dimensional)',
    limit: 'number (default 12)',
    threshold: 'number 0-1 (default 0.78)',
  },
};