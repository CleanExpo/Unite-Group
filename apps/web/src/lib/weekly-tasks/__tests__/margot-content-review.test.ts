import { describe, expect, it, vi } from "vitest";
import { saveMargotContentReview, readContentEvents } from "../margot-content-review";

// Synthetic transport only. No session credentials, provider calls or real writes.
describe("Margot content decision boundaries", () => {
  it("rejects an absent owner before reading or writing", async () => {
    const store = { getCollection: vi.fn(), getRow: vi.fn(), getEvent: vi.fn(), insertEvent: vi.fn(), listEvents: vi.fn() };
    const result = await saveMargotContentReview({ ownerId: null, collectionId: "11111111-1111-4111-8111-111111111111", store, body: {} });
    expect(result.status).toBe("unauthorised");
    for (const operation of Object.values(store)) expect(operation).not.toHaveBeenCalled();
  });
  it("rejects client-supplied approval hashes and unknown fields before any store use", async () => {
    const store = { getCollection: vi.fn(), getRow: vi.fn(), getEvent: vi.fn(), insertEvent: vi.fn(), listEvents: vi.fn() };
    const result = await saveMargotContentReview({ ownerId: "owner", collectionId: "11111111-1111-4111-8111-111111111111", store, body: { action: "approve", assetSHA256: "a".repeat(64) } });
    expect(result.status).toBe("invalid");
    for (const operation of Object.values(store)) expect(operation).not.toHaveBeenCalled();
  });
});

import source from "./margot-first-five.fixture.json";
import { exportMargotPrivatePacket } from "../margot-packet-ingestion.operator";
import { packetDigest, canonicalPacketJSON } from "../margot-packet";
import { MARGOT_COLLECTION_MARKER } from "../margot-private-storage";
vi.mock("server-only", () => ({}));
const ownerId = "11111111-1111-4111-8111-111111111111";
const collectionId = "22222222-2222-4222-8222-222222222222";
const rowId = "33333333-3333-4333-8333-333333333333";
const operationId = "44444444-4444-4444-8444-444444444444";
function fixture() {
  const packet = exportMargotPrivatePacket(source);
  const active = { rowId, batchId: "synthetic-week", version: 1, packetSHA256: packetDigest(packet) };
  const pointer = { id: collectionId, owner_id: ownerId, database_id: collectionId, archived_at: null, cells: { kind: "margot-weekly-active-pointer", schemaVersion: 1, revision: 1, active } };
  const version = { id: rowId, owner_id: ownerId, database_id: collectionId, archived_at: null, cells: { kind: "margot-weekly-packet", schemaVersion: 1, ...active, packet, sourceManifestSHA256: "a".repeat(64) } };
  delete (version.cells as Partial<typeof version.cells>).rowId;
  const events = new Map<string, import("../margot-private-storage").MargotRow>();
  const store = {
    getCollection: vi.fn(async () => ({ data: { id: collectionId, owner_id: ownerId, name: "Synthetic", description: MARGOT_COLLECTION_MARKER }, error: null as unknown })),
    getRow: vi.fn(async (_owner: string, _collection: string, id: string) => ({ data: id === collectionId ? pointer : version, error: null as unknown })),
    getEvent: vi.fn(async (_owner: string, _collection: string, id: string) => ({ data: events.get(id) ?? null, error: null as unknown })),
    insertEvent: vi.fn(async (row: import("../margot-private-storage").MargotRow) => { events.set(row.id, structuredClone(row)); return { error: null as unknown }; }),
    listEvents: vi.fn(async () => ({ data: [...events.values()], error: null as unknown })),
  };
  const body = { operationId, batchId: active.batchId, version: active.version, packetSHA256: active.packetSHA256, episodeId: packet.episodes[0].id, action: "request_changes", feedback: "Please correct the synthetic caption." };
  return { ownerId, collectionId, packet, pointer, version, events, store, body };
}

describe("immutable version-specific decisions", () => {
  it("persists and verifies one content-only event, then replays without another insert", async () => {
    const f = fixture();
    const first = await saveMargotContentReview(f);
    expect(first.status).toBe("saved");
    const event = [...f.events.values()][0];
    expect(JSON.stringify(event)).not.toContain('"releaseApproval":"approved"');
    expect(JSON.stringify(event)).not.toContain(f.packet.episodes[0].script);
    const second = await saveMargotContentReview(f);
    expect(second.status).toBe("saved");
    expect(f.store.insertEvent).toHaveBeenCalledTimes(1);
    expect(canonicalPacketJSON([...f.events.values()][0])).toBe(canonicalPacketJSON(event));
  });
  it("rejects changed payload reuse of the operation UUID without overwrite", async () => {
    const f = fixture();
    await saveMargotContentReview(f);
    f.body.feedback = "A different decision payload.";
    expect((await saveMargotContentReview(f)).status).toBe("conflict");
    expect(f.store.insertEvent).toHaveBeenCalledTimes(1);
  });
  it("does not save when a returned collection belongs to someone else", async () => {
    const f = fixture();
    f.store.getCollection.mockResolvedValue({ data: { id: collectionId, owner_id: "other", name: "Synthetic", description: MARGOT_COLLECTION_MARKER }, error: null as unknown });
    expect((await saveMargotContentReview(f)).status).not.toBe("saved");
    expect(f.store.insertEvent).not.toHaveBeenCalled();
  });
  it("rejects a stale packet before insert", async () => {
    const f = fixture(); f.body.packetSHA256 = "f".repeat(64);
    expect((await saveMargotContentReview(f)).status).toBe("stale");
    expect(f.store.insertEvent).not.toHaveBeenCalled();
  });
  it("does not approve a video without verified exact-byte playback evidence", async () => {
    const f = fixture(); f.body.action = "approve"; f.body.feedback = "";
    expect((await saveMargotContentReview(f)).status).toBe("media_unavailable");
    expect(f.store.insertEvent).not.toHaveBeenCalled();
  });
  it("rejects blank change requests without writes", async () => {
    const f = fixture(); f.body.feedback = "   ";
    expect((await saveMargotContentReview(f)).status).toBe("invalid");
    expect(f.store.insertEvent).not.toHaveBeenCalled();
  });
  it("does not claim save on a failed insert without matching readback", async () => {
    const f = fixture(); f.store.insertEvent.mockImplementation(async () => ({ error: new Error("synthetic private database detail") }));
    const result = await saveMargotContentReview(f);
    expect(result.status).toBe("unavailable");
    expect(JSON.stringify(result)).not.toContain("synthetic private database detail");
  });
  it("records a racing superseded decision only as history, never saved-current", async () => {
    const f = fixture();
    f.store.insertEvent.mockImplementation(async row => { f.events.set(row.id, structuredClone(row)); f.pointer.cells.active.version = 2; return { error: null as unknown }; });
    expect((await saveMargotContentReview(f)).status).toBe("stale");
    expect(f.events.size).toBe(1);
  });
});

describe("fresh and internally consistent event projection", () => {
  it("reconciles an insert that saved before its transport response failed", async () => {
    const f = fixture();
    f.store.insertEvent.mockImplementation(async row => { f.events.set(row.id, structuredClone(row)); throw new Error("transport lost"); });
    expect((await saveMargotContentReview(f)).status).toBe("saved");
    expect(f.store.insertEvent).toHaveBeenCalledTimes(1);
  });
  it("returns every current packet identity field with verified decisions", async () => {
    const f = fixture(); await saveMargotContentReview(f);
    const projected = await readContentEvents(f);
    expect(projected).toMatchObject({ status: "available", batchId: f.body.batchId, version: 1, packetSHA256: f.body.packetSHA256 });
  });
  it("rejects a same-digest version bump during the event read", async () => {
    const f = fixture(); await saveMargotContentReview(f);
    f.store.listEvents.mockImplementation(async () => { f.pointer.cells.active.version = 2; f.version.cells.version = 2; return { data: [...f.events.values()], error: null }; });
    expect((await readContentEvents(f)).status).toBe("unavailable");
  });
  it.each(["scriptSHA256", "mediaSHA256", "videoId"])("rejects contradictory stored %s even when full record digest matches", async field => {
    const f = fixture(); await saveMargotContentReview(f);
    const row = f.events.get(operationId)!;
    (row.cells as Record<string, unknown>)[field] = field === "videoId" ? "f".repeat(32) : "f".repeat(64);
    expect((await readContentEvents(f)).status).toBe("unavailable");
  });
  it("does not turn a failed event query with data into empty approval state", async () => {
    const f = fixture(); f.store.listEvents.mockResolvedValue({ data: [], error: new Error("private read failure") });
    expect((await readContentEvents(f)).status).toBe("unavailable");
  });
});
it("saves a whole-proposal decision only after verified exact playback and binds every field", async () => {
  const f = fixture();
  const media = f.packet.episodes[0].media;
  if (media.kind === "awaiting_render") throw new Error("Fixture requires rendered video");
  media.asset = { sha256: "e".repeat(64), bucket: "media-uploads", objectPath: `${ownerId}/margot/${"e".repeat(64)}.mp4`, rendition: "captioned_mp4" };
  const hash = packetDigest(f.packet); f.pointer.cells.active.packetSHA256 = hash; f.version.cells.packetSHA256 = hash; f.body.packetSHA256 = hash;
  f.body.action = "approve"; f.body.feedback = "";
  const canPlay = vi.fn(async () => true);
  const result = await saveMargotContentReview({ ...f, canPlay });
  expect(result.status).toBe("saved"); expect(canPlay).toHaveBeenCalledWith(f.packet.episodes[0], ownerId);
  if (result.status === "saved") {
    expect(result.event.episodeSHA256).toBe(packetDigest(f.packet.episodes[0]));
    expect(result.event.mediaSHA256).toBe("e".repeat(64)); expect(result.event.publicationApproved).toBe(false);
  }
});
