import { describe, expect, it } from "vitest";
import {
  assertCoverageGate,
  assertEmbeddingDimensions,
  assertSemanticWriteTarget,
  chunkText,
  contentFingerprint,
  normalisePage,
  withRetry,
} from "../semantic-ingestion";

describe("Nexus semantic ingestion", () => {
  it("chunks deterministically with overlap and no empty tail", () => {
    expect(chunkText("abcdefghij", { size: 6, overlap: 2 })).toEqual([
      "abcdef",
      "efghij",
    ]);
    expect(chunkText("", { size: 6, overlap: 2 })).toEqual([]);
  });

  it("rejects invalid chunk settings", () => {
    expect(() => chunkText("text", { size: 4, overlap: 4 })).toThrow(
      "overlap must be smaller than size",
    );
  });

  it("normalises a page into one page input and stable indexed chunks", () => {
    const result = normalisePage(
      {
        id: "page-1",
        title: "  Fresh page  ",
        content: "abcdefghij",
        updated_at: "2026-07-13T00:00:00.000Z",
      },
      { size: 6, overlap: 2 },
    );

    expect(result.title).toBe("Fresh page");
    expect(result.chunks).toEqual([
      { chunk_index: 0, content: "abcdef" },
      { chunk_index: 1, content: "efghij" },
    ]);
    expect(result.fingerprint).toBe(contentFingerprint("abcdefghij"));
  });

  it("fails closed when page vectors, chunks, freshness, or duplicates miss the gate", () => {
    expect(() =>
      assertCoverageGate({
        wiki_pages: 620,
        page_vectors: 620,
        chunk_documents: 619,
        duplicate_chunk_keys: 0,
        stale_documents: 0,
      }),
    ).toThrow("chunk coverage 619/620");

    expect(() =>
      assertCoverageGate({
        wiki_pages: 620,
        page_vectors: 620,
        chunk_documents: 620,
        duplicate_chunk_keys: 1,
        stale_documents: 0,
      }),
    ).toThrow("duplicate chunk keys 1");
  });

  it("passes only at complete, fresh, duplicate-free coverage", () => {
    expect(
      assertCoverageGate({
        wiki_pages: 620,
        page_vectors: 620,
        chunk_documents: 620,
        duplicate_chunk_keys: 0,
        stale_documents: 0,
        actionable_documents: 0,
        freshness_policy_documents: 620,
      }),
    ).toEqual({
      passed: true,
      summary: "620/620 pages have page vectors and chunks",
    });
  });

  it("rejects actionable defects while keeping unchanged age-policy rows visible", () => {
    expect(() =>
      assertCoverageGate({
        wiki_pages: 10,
        page_vectors: 10,
        chunk_documents: 10,
        duplicate_chunk_keys: 0,
        stale_documents: 1,
        actionable_documents: 1,
        freshness_policy_documents: 9,
      }),
    ).toThrow("actionable documents 1");
  });

  it("refuses production and requires an explicit write arm for non-production", () => {
    expect(() =>
      assertSemanticWriteTarget(
        "https://lksfwktwtmyznckodsau.supabase.co",
        true,
      ),
    ).toThrow("production Supabase project");
    expect(() =>
      assertSemanticWriteTarget("https://branch-ref.supabase.co", false),
    ).toThrow("explicitly armed");
    expect(() =>
      assertSemanticWriteTarget("https://branch-ref.supabase.co", true),
    ).not.toThrow();
  });

  it("rejects embeddings that are not exactly 1536 dimensions", () => {
    expect(() => assertEmbeddingDimensions([0.1, 0.2])).toThrow(
      "expected 1536 embedding dimensions",
    );
    expect(() => assertEmbeddingDimensions(Array(1536).fill(0.1))).not.toThrow();
  });

  it("retries transient work up to the bounded attempt count", async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("transient");
        return "ok";
      },
      { maxAttempts: 3, delayMs: 0 },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("fails closed after the bounded retry budget is exhausted", async () => {
    let attempts = 0;
    await expect(
      withRetry(
        async () => {
          attempts += 1;
          throw new Error("still broken");
        },
        { maxAttempts: 2, delayMs: 0 },
      ),
    ).rejects.toThrow("still broken");
    expect(attempts).toBe(2);
  });
});
