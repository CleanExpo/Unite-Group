import { createHash } from "node:crypto";

export type WikiPage = {
  id: string;
  title: string | null;
  content: string | null;
  updated_at: string | null;
};

export type ChunkSettings = {
  size: number;
  overlap: number;
};

export type SemanticCoverage = {
  wiki_pages: number;
  page_vectors: number;
  chunk_documents: number;
  duplicate_chunk_keys: number;
  stale_documents: number;
};

export const DEFAULT_CHUNK_SETTINGS: ChunkSettings = {
  size: 800,
  overlap: 100,
};

export function contentFingerprint(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function chunkText(
  text: string,
  settings: ChunkSettings = DEFAULT_CHUNK_SETTINGS,
): string[] {
  if (settings.size <= 0) throw new Error("size must be positive");
  if (settings.overlap < 0) throw new Error("overlap must not be negative");
  if (settings.overlap >= settings.size) {
    throw new Error("overlap must be smaller than size");
  }
  if (!text) return [];

  const chunks: string[] = [];
  const step = settings.size - settings.overlap;
  for (let start = 0; start < text.length; start += step) {
    const chunk = text.slice(start, start + settings.size);
    if (chunk.length > 0) chunks.push(chunk);
    if (start + settings.size >= text.length) break;
  }
  return chunks;
}

export function normalisePage(
  page: WikiPage,
  settings: ChunkSettings = DEFAULT_CHUNK_SETTINGS,
) {
  const content = page.content ?? "";
  return {
    source_id: page.id,
    title: page.title?.trim() || "Untitled",
    content,
    source_updated_at: page.updated_at,
    fingerprint: contentFingerprint(content),
    chunks: chunkText(content, settings).map((chunk, chunk_index) => ({
      chunk_index,
      content: chunk,
    })),
  };
}

export function assertCoverageGate(coverage: SemanticCoverage) {
  const errors: string[] = [];
  if (coverage.page_vectors !== coverage.wiki_pages) {
    errors.push(
      `page-vector coverage ${coverage.page_vectors}/${coverage.wiki_pages}`,
    );
  }
  if (coverage.chunk_documents !== coverage.wiki_pages) {
    errors.push(
      `chunk coverage ${coverage.chunk_documents}/${coverage.wiki_pages}`,
    );
  }
  if (coverage.duplicate_chunk_keys > 0) {
    errors.push(`duplicate chunk keys ${coverage.duplicate_chunk_keys}`);
  }
  if (coverage.stale_documents > 0) {
    errors.push(`stale documents ${coverage.stale_documents}`);
  }
  if (errors.length > 0) {
    throw new Error(`semantic coverage gate failed: ${errors.join("; ")}`);
  }
  return {
    passed: true as const,
    summary: `${coverage.wiki_pages}/${coverage.wiki_pages} pages have page vectors and chunks`,
  };
}
