// src/lib/rag/embed.ts
// OpenAI embeddings over plain fetch — zero new dependencies (estate No-Invaders rule;
// same idiom as scripts/nexus-semantic-backfill.ts). Model: text-embedding-3-small at
// 1536 dims, the repo's pgvector standard (vector(1536), cosine, ivfflat).
//
// Fail loud but graceful: a missing key throws a clear error and the CALLER decides
// how to degrade (per src/lib/integrations/CLAUDE.md — never silently fake).

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const MODEL = 'text-embedding-3-small';
const DIMENSIONS = 1536;

interface OpenAIEmbeddingsResponse {
  data: Array<{ index: number; embedding: number[] }>;
}

export async function embed(text: string): Promise<number[]> {
  const [vector] = await embedBatch([text]);
  return vector;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  // Read at call time, not module level (stale module-level env burned us before).
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('[rag] OPENAI_API_KEY not configured');
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, dimensions: DIMENSIONS, input: texts }),
  });
  if (!response.ok) {
    throw new Error(`[rag] OpenAI embeddings request failed (${response.status})`);
  }

  const payload = (await response.json()) as OpenAIEmbeddingsResponse;
  if (!Array.isArray(payload.data) || payload.data.length !== texts.length) {
    throw new Error('[rag] OpenAI embeddings response shape mismatch');
  }
  return payload.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
}
