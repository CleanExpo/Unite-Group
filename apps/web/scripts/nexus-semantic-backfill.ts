#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
import {
  assertCoverageGate,
  contentFingerprint,
  normalisePage,
  type SemanticCoverage,
  type WikiPage,
} from "../src/lib/nexus/semantic-ingestion";

const MODEL = "text-embedding-3-large";
const DIMENSIONS = 1536;
const PAGE_SIZE = 100;
const PROD_PROJECT_REF = "lksfwktwtmyznckodsau";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assertSandboxTarget(url: string) {
  const hostname = new URL(url).hostname;
  if (hostname.startsWith(`${PROD_PROJECT_REF}.`)) {
    throw new Error("refusing to write to the production Supabase project");
  }
  if (process.env.NEXUS_SEMANTIC_ALLOW_WRITE !== "1") {
    throw new Error(
      "NEXUS_SEMANTIC_ALLOW_WRITE=1 is required for sandbox writes",
    );
  }
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
  assertSandboxTarget(supabaseUrl);
  const serviceRoleKey = requiredEnv("NEXUS_SANDBOX_SERVICE_ROLE_KEY");
  const openAiKey = requiredEnv("OPENAI_API_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const pages: WikiPage[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("wiki_pages")
      .select("id,title,content,updated_at")
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    pages.push(...((data ?? []) as WikiPage[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  if (pages.length === 0) throw new Error("sandbox has zero wiki_pages");
  console.log(`Loaded ${pages.length} sandbox wiki pages`);

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const normalised = normalisePage(page);
    const semanticText = normalised.content.trim() || normalised.title;
    const chunks = normalised.chunks.length
      ? normalised.chunks
      : [{ chunk_index: 0, content: semanticText }];
    const vectors = await embed(
      [semanticText.slice(0, 30_000), ...chunks.map((chunk) => chunk.content)],
      openAiKey,
    );
    const rpcChunks = chunks.map((chunk, chunkIndex) => ({
      ...chunk,
      embedding: vectors[chunkIndex + 1],
      content_sha256: contentFingerprint(chunk.content),
    }));

    const { data, error } = await supabase.rpc(
      "upsert_wiki_semantic_document",
      {
        p_source_id: normalised.source_id,
        p_title: normalised.title,
        p_content: normalised.content.slice(0, 30_000),
        p_embedding: vectors[0],
        p_embedding_model: MODEL,
        p_source_updated_at: normalised.source_updated_at,
        p_content_sha256: normalised.fingerprint,
        p_chunks: rpcChunks,
      },
    );
    if (error) throw error;
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
