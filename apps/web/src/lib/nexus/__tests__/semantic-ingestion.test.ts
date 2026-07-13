import { describe, expect, it } from "vitest";
import {
  assertCoverageGate,
  chunkText,
  contentFingerprint,
  normalisePage,
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
      }),
    ).toEqual({
      passed: true,
      summary: "620/620 pages have page vectors and chunks",
    });
  });
});
