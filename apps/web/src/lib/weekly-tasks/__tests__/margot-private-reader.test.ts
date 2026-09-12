import { describe, expect, it, vi } from "vitest";
import legacyFixture from "./margot-first-five.fixture.json";
import {
  parseMargotPrivatePacket,
  canonicalPacketJSON,
  packetDigest,
} from "../margot-packet";
import {
  readMargotPrivatePacket,
  MARGOT_COLLECTION_MARKER,
} from "../margot-packet-reader";

vi.mock("server-only", () => ({}));
const owner = "11111111-1111-4111-8111-111111111111";
const collection = "22222222-2222-4222-8222-222222222222";
const rowId = "33333333-3333-4333-8333-333333333333";
const packet = () => ({
  ...structuredClone(legacyFixture),
  schemaVersion: 2,
  releaseEligible: false,
  episodes: legacyFixture.episodes.map((episode, index) => {
    const { productionStatus: _status, videoId: _id, ...display } = episode;
    return {
      ...display,
      scriptApproval: index === 0 ? "approved" : "pending",
      media: {
        kind: index === 0 ? "approved_reference" : "generated_draft",
        videoId: String(index + 1).repeat(32),
      },
    };
  }),
});
function fixture() {
  const content = packet();
  const digest = packetDigest(content);
  const reference = {
    rowId,
    batchId: "synthetic-week-01",
    version: 1,
    packetSHA256: digest,
  };
  const pointer = {
    id: collection,
    owner_id: owner,
    database_id: collection,
    archived_at: null,
    cells: {
      kind: "margot-weekly-active-pointer",
      schemaVersion: 1,
      revision: 1,
      active: reference,
    },
  };
  const version = {
    id: rowId,
    owner_id: owner,
    database_id: collection,
    archived_at: null,
    cells: {
      kind: "margot-weekly-packet",
      schemaVersion: 1,
      batchId: reference.batchId,
      version: 1,
      packet: content,
      packetSHA256: digest,
      sourceManifestSHA256: "a".repeat(64),
    },
  };
  const db = {
    id: collection,
    owner_id: owner,
    name: "Synthetic private review",
    description: MARGOT_COLLECTION_MARKER,
  };
  const store = {
    getCollection: vi.fn(async () => ({ data: db, error: null })),
    getRow: vi.fn(async (_owner: string, _collection: string, id: string) => ({
      data: id === collection ? pointer : version,
      error: null,
    })),
  };
  const input = {
    ownerId: owner,
    collectionId: collection,
    store,
    now: new Date(content.reviewDueAt),
  };
  return { content, pointer, version, db, store, input };
}

describe("private display contract", () => {
  it("accepts five explicitly unapproved review videos without treating drafts as masters", () => {
    expect(parseMargotPrivatePacket(packet()).success).toBe(true);
  });
  it.each([
    "release",
    "release-approval",
    "reference",
    "generated",
    "duplicate",
    "Thursday",
    "Monday",
    "extra",
    "video",
    "oversized",
  ])("rejects invalid %s contract", (reason) => {
    const value = packet();
    if (reason === "release") Object.assign(value, { releaseEligible: true });
    if (reason === "release-approval")
      value.episodes[1].releaseApproval = "approved";
    if (reason === "reference") value.episodes[0].scriptApproval = "pending";
    if (reason === "generated") value.episodes[1].scriptApproval = "approved";
    if (reason === "duplicate") value.episodes[1].id = value.episodes[0].id;
    if (reason === "Thursday") value.weekStartsAt = "2026-09-11T16:00:00+10:00";
    if (reason === "Monday") value.reviewDueAt = value.weekStartsAt;
    if (reason === "extra")
      Object.assign(value.episodes[1], {
        providerResponse: "must never enter display",
      });
    if (reason === "video")
      value.episodes[1].media.videoId = "javascript:alert(1)";
    if (reason === "oversized") value.episodes[1].script = "x".repeat(20001);
    expect(parseMargotPrivatePacket(value).success).toBe(false);
  });
  it("canonicalises nested object key order without changing array order or wording", () => {
    const first = { z: [{ b: "  exact wording\n", a: 1 }], a: false };
    const second = { a: false, z: [{ a: 1, b: "  exact wording\n" }] };
    expect(canonicalPacketJSON(first)).toBe(canonicalPacketJSON(second));
    expect(packetDigest(first)).toBe(packetDigest(second));
    expect(canonicalPacketJSON(first)).toContain("  exact wording\\n");
  });
});

describe("explicit private pointer reader", () => {
  it("performs no reads without an authenticated owner", async () => {
    const f = fixture();
    expect(
      await readMargotPrivatePacket({ ...f.input, ownerId: null }),
    ).toEqual({ source: "unavailable" });
    expect(f.store.getCollection).not.toHaveBeenCalled();
    expect(f.store.getRow).not.toHaveBeenCalled();
  });
  it.each([undefined, "", "not-a-uuid"])(
    "does not query missing/malformed configuration %s",
    async (collectionId) => {
      const f = fixture();
      const result = await readMargotPrivatePacket({
        ...f.input,
        collectionId,
      });
      expect(result.source).toBe(
        collectionId === undefined ? "not_configured" : "invalid",
      );
      expect(f.store.getCollection).not.toHaveBeenCalled();
    },
  );
  it("reads only the explicitly selected version with owner and collection scope", async () => {
    const f = fixture();
    const result = await readMargotPrivatePacket(f.input);
    expect(result).toMatchObject({
      source: "available",
      packet: f.content,
      batchId: "synthetic-week-01",
      version: 1,
      calendar: "current",
    });
    expect(f.store.getCollection).toHaveBeenCalledWith(owner, collection);
    expect(f.store.getRow.mock.calls).toEqual([
      [owner, collection, collection],
      [owner, collection, rowId],
    ]);
  });
  it.each([
    "collection-owner",
    "collection-marker",
    "pointer-owner",
    "version-owner",
    "version-collection",
    "archive",
    "digest",
    "pointer-digest",
    "version",
    "batch",
    "self-pointer",
    "pointer-kind",
  ])("fails closed for %s", async (reason) => {
    const f = fixture();
    if (reason === "collection-owner") f.db.owner_id = rowId;
    if (reason === "collection-marker")
      f.db.description = "ordinary collection";
    if (reason === "pointer-owner") f.pointer.owner_id = rowId;
    if (reason === "version-owner") f.version.owner_id = rowId;
    if (reason === "version-collection") f.version.database_id = rowId;
    if (reason === "archive")
      Object.assign(f.version, { archived_at: new Date().toISOString() });
    if (reason === "digest")
      f.version.cells.packet.episodes[1].script += " changed";
    if (reason === "pointer-digest")
      f.pointer.cells.active.packetSHA256 = "b".repeat(64);
    if (reason === "version") f.version.cells.version = 2;
    if (reason === "batch") f.version.cells.batchId = "different";
    if (reason === "self-pointer") f.pointer.cells.active.rowId = collection;
    if (reason === "pointer-kind") f.pointer.cells.kind = "ordinary-row";
    expect((await readMargotPrivatePacket(f.input)).source).toBe("invalid");
  });
  it("marks stale and future batches explicitly while preserving the selected packet", async () => {
    const f = fixture();
    expect(
      await readMargotPrivatePacket({
        ...f.input,
        now: new Date(Date.parse(f.content.weekStartsAt) + 8 * 86400000),
      }),
    ).toMatchObject({ source: "available", calendar: "stale" });
    expect(
      await readMargotPrivatePacket({
        ...f.input,
        now: new Date(Date.parse(f.content.reviewDueAt) - 8 * 86400000),
      }),
    ).toMatchObject({ source: "available", calendar: "future" });
  });
  it("treats read failures as unavailable, never consumes accompanying data", async () => {
    const f = fixture();
    f.store.getCollection.mockResolvedValueOnce({
      data: f.db,
      error: { message: "private detail" },
    } as never);
    expect(await readMargotPrivatePacket(f.input)).toEqual({
      source: "unavailable",
    });
    expect(f.store.getRow).not.toHaveBeenCalled();
  });
  it("distinguishes a missing selected row from a database failure without fallback", async () => {
    const f = fixture();
    f.store.getRow.mockResolvedValueOnce({ data: null, error: null } as never);
    expect(await readMargotPrivatePacket(f.input)).toEqual({
      source: "missing",
    });
    expect(f.store.getRow).toHaveBeenCalledTimes(1);
  });
});

it("the session adapter adds owner, collection, exact row and archive filters to actual GET requests", async () => {
  const { createClient } = await import("@supabase/supabase-js");
  const { createMargotReadStore } = await import("../margot-private-storage");
  const requests: Array<{ url: URL; method: string }> = [];
  const client = createClient<
    import("../margot-private-storage").MargotLiveDatabase
  >("https://synthetic.invalid", "synthetic-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input, init) => {
        requests.push({
          url: new URL(String(input)),
          method: init?.method ?? "GET",
        });
        return new Response("null", { status: 200 });
      },
    },
  });
  const store = createMargotReadStore(client);
  await store.getCollection(owner, collection);
  await store.getRow(owner, collection, rowId);
  expect(requests.map((item) => item.method)).toEqual(["GET", "GET"]);
  expect(requests[0].url.searchParams.get("id")).toBe(`eq.${collection}`);
  expect(requests[0].url.searchParams.get("owner_id")).toBe(`eq.${owner}`);
  expect(requests[1].url.searchParams.get("id")).toBe(`eq.${rowId}`);
  expect(requests[1].url.searchParams.get("owner_id")).toBe(`eq.${owner}`);
  expect(requests[1].url.searchParams.get("database_id")).toBe(
    `eq.${collection}`,
  );
  expect(requests[1].url.searchParams.get("archived_at")).toBe("is.null");
});

it("marks the prior selected pack stale when the following Monday review becomes due", async () => {
  const f = fixture();
  const nextReview = Date.parse(f.content.reviewDueAt) + 7 * 86400000;
  expect(
    await readMargotPrivatePacket({
      ...f.input,
      now: new Date(nextReview - 1),
    }),
  ).toMatchObject({ source: "available", calendar: "current" });
  expect(
    await readMargotPrivatePacket({ ...f.input, now: new Date(nextReview) }),
  ).toMatchObject({ source: "available", calendar: "stale" });
});
