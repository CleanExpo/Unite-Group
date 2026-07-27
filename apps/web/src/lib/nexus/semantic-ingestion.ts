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
  missing_page_vectors?: number;
  missing_chunk_documents?: number;
  invalid_chunk_vectors?: number;
  stale_chunk_documents?: number;
  actionable_documents?: number;
  freshness_policy_documents?: number;
};

const PROD_PROJECT_REF = "lksfwktwtmyznckodsau";
const EMBEDDING_DIMENSIONS = 1536;

export const DEFAULT_CHUNK_SETTINGS: ChunkSettings = {
  size: 800,
  overlap: 100,
};

export function contentFingerprint(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function assertSemanticWriteTarget(
  url: string,
  explicitlyArmed: boolean,
  approvedBranchProjectRef: string,
) {
  const target = new URL(url);
  const hostname = target.hostname.toLowerCase();
  if (
    hostname === `${PROD_PROJECT_REF}.supabase.co` ||
    hostname.startsWith(`${PROD_PROJECT_REF}.`)
  ) {
    throw new Error("refusing to write to the production Supabase project");
  }
  if (!explicitlyArmed) {
    throw new Error("non-production semantic writes must be explicitly armed");
  }
  const approvedRef = approvedBranchProjectRef.trim().toLowerCase();
  if (
    !approvedRef ||
    approvedRef === PROD_PROJECT_REF ||
    target.protocol !== "https:" ||
    target.port ||
    target.username ||
    target.password ||
    hostname !== `${approvedRef}.supabase.co`
  ) {
    throw new Error(
      "semantic writes require the approved non-production Supabase branch",
    );
  }
}

export function assertEmbeddingDimensions(embedding: number[]): void {
  if (
    embedding.length !== EMBEDDING_DIMENSIONS ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(
      `expected ${EMBEDDING_DIMENSIONS} embedding dimensions with finite values`,
    );
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { maxAttempts: number; delayMs: number },
): Promise<T> {
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) {
    throw new Error("maxAttempts must be a positive integer");
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < options.maxAttempts && options.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
    }
  }
  throw lastError;
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
  const actionableDocuments =
    coverage.actionable_documents ?? coverage.stale_documents;
  if (actionableDocuments > 0) {
    errors.push(`actionable documents ${actionableDocuments}`);
  }
  if (errors.length > 0) {
    throw new Error(`semantic coverage gate failed: ${errors.join("; ")}`);
  }
  return {
    passed: true as const,
    summary: `${coverage.wiki_pages}/${coverage.wiki_pages} pages have page vectors and chunks`,
  };
}
