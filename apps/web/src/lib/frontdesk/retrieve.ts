import type { CorpusChunk } from '../aiw/corpus';

/**
 * Keyword-overlap retrieval over corpus chunks — the RAG grounding fallback used until
 * an embeddings key is provisioned (pgvector is ready on the DB; the embed step is not).
 * Deterministic and dependency-free so the agent can be grounded and tested today.
 */
export function retrieveContext(query: string, chunks: CorpusChunk[], topK = 3): CorpusChunk[] {
  const terms = tokenize(query);
  if (terms.length === 0 || chunks.length === 0) return [];

  return chunks
    .map((chunk) => ({ chunk, score: overlap(terms, tokenize(chunk.text)) }))
    .filter((scored) => scored.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.index - b.chunk.index)
    .slice(0, topK)
    .map((scored) => scored.chunk);
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 2);
}

function overlap(queryTerms: string[], docTerms: string[]): number {
  const docSet = new Set(docTerms);
  return queryTerms.reduce((n, term) => n + (docSet.has(term) ? 1 : 0), 0);
}
