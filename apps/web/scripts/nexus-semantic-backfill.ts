#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
import {
  assertCoverageGate,
  assertEmbeddingDimensions,
  assertSemanticWriteTarget,
  contentFingerprint,
  normalisePage,
  withRetry,
  type SemanticCoverage,
  type WikiPage,
} from "../src/lib/nexus/semantic-ingestion";

const MODEL = "text-embedding-3-large";
const DIMENSIONS = 1536;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1_000;
const DEFAULT_MAX_ATTEMPTS = 3;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function integerArgument(name: string, fallback: number, maximum: number): number {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

async function embed(inputs: string[], apiKey: string): Promise<number[][]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      dimensions: DIMENSIONS,
      input: inputs,
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI embeddings failed (${response.status})`);
  }
  const payload = (await response.json()) as {
    data: Array<{ index: number; embedding: number[] }>;
  };
  return payload.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

async function main() {
  if (!process.argv.includes("--apply")) {
    throw new Error(
      "dry by default: pass --apply plus NEXUS_SEMANTIC_ALLOW_WRITE=1",
    );
  }

  const supabaseUrl = requiredEnv("NEXUS_SANDBOX_SUPABASE_URL");
  assertSemanticWriteTarget(
    supabaseUrl,
    process.env.NEXUS_SEMANTIC_ALLOW_WRITE === "1",
  );
  const serviceRoleKey = requiredEnv("NEXUS_SANDBOX_SERVICE_ROLE_KEY");
  const openAiKey = requiredEnv("OPENAI_API_KEY");
  const limit = integerArgument("--limit", DEFAULT_LIMIT, MAX_LIMIT);
  const maxAttempts = integerArgument(
    "--max-attempts",
    DEFAULT_MAX_ATTEMPTS,
    10,
  );
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: queuedPages } = await withRetry(
    async () => {
      const result = await supabase.rpc("wiki_pages_needing_embedding", {
        p_limit: limit,
      });
      if (result.error) throw result.error;
      return result;
    },
    { maxAttempts, delayMs: 500 },
  );
  const pages = (queuedPages ?? []) as WikiPage[];
  console.log(`Loaded ${pages.length} actionable wiki pages (limit ${limit})`);

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const normalised = normalisePage(page);
    const semanticText = normalised.content.trim() || normalised.title;
    const chunks = normalised.chunks.length
      ? normalised.chunks
      : [{ chunk_index: 0, content: semanticText }];
    const vectors = await withRetry(
      () =>
        embed(
          [
            semanticText.slice(0, 30_000),
            ...chunks.map((chunk) => chunk.content),
          ],
          openAiKey,
        ),
      { maxAttempts, delayMs: 500 },
    );
    vectors.forEach(assertEmbeddingDimensions);
    const rpcChunks = chunks.map((chunk, chunkIndex) => ({
      ...chunk,
      embedding: vectors[chunkIndex + 1],
      content_sha256: contentFingerprint(chunk.content),
    }));

    const { data } = await withRetry(
      async () => {
        const result = await supabase.rpc("upsert_wiki_semantic_document", {
          p_source_id: normalised.source_id,
          p_title: normalised.title,
          p_content: normalised.content.slice(0, 30_000),
          p_embedding: vectors[0],
          p_embedding_model: MODEL,
          p_source_updated_at: normalised.source_updated_at,
          p_content_sha256: normalised.fingerprint,
          p_chunks: rpcChunks,
        });
        if (result.error) throw result.error;
        return result;
      },
      { maxAttempts, delayMs: 500 },
    );
    if (!data?.[0] || data[0].chunk_count !== rpcChunks.length) {
      throw new Error(`write read-back failed for ${normalised.source_id}`);
    }
    console.log(
      `[${index + 1}/${pages.length}] ${normalised.source_id}: ${rpcChunks.length} chunks`,
    );
  }

  const { data, error } = await supabase.rpc("nexus_semantic_coverage", {
    p_freshness_interval: "30 days",
  });
  if (error) throw error;
  const verdict = assertCoverageGate(data as SemanticCoverage);
  console.log(JSON.stringify({ coverage: data, verdict }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
