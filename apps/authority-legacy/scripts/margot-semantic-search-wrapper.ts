/**
 * Margot Semantic Search Wrapper
 * High-level helper optimized for Margot's research and synthesis workflows
 */

import { semanticSearch } from './pi-ceo-semantic-search-wrapper';

export interface MargotSearchResult {
  title: string;
  content: string;
  similarity: number;
  source: string;
  chunk_index: number;
}

export async function margotSemanticSearch(
  queryEmbedding: number[],
  maxResults: number = 10
): Promise<MargotSearchResult[]> {
  const results = await semanticSearch(queryEmbedding, maxResults, 0.76);

  return results.map(r => ({
    title: r.title,
    content: r.content,
    similarity: Math.round(r.similarity * 100) / 100,
    source: r.source_id,
    chunk_index: r.chunk_index,
  }));
}

/**
 * Quick synthesis helper for Margot:
 * Returns top relevant context for a topic
 */
export async function getRelevantBrainContext(
  queryEmbedding: number[],
  limit = 8
): Promise<string> {
  const results = await margotSemanticSearch(queryEmbedding, limit);

  if (!results.length) return 'No relevant context found in the 2nd Brain.';

  let output = 'Relevant context from 2nd Brain:\n\n';

  results.forEach((r, i) => {
    output += `${i + 1}. [${r.similarity}] ${r.title}\n`;
    output += `   ${r.content.substring(0, 280)}...\n\n`;
  });

  return output;
}

export const margotSemanticSearchTool = {
  name: 'margot_semantic_search',
  description: 'Fast semantic retrieval from the entire 2nd Brain for research and synthesis.',
  parameters: {
    query_embedding: 'number[]',
    maxResults: 'number (default 10)',
  },
};