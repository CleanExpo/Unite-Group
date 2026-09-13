import { describe, expect, it, vi } from "vitest";
import { resolveMargotMedia } from "../margot-media-access";
vi.mock("server-only", () => ({}));
describe("private playback boundary", () => {
  it("never invokes privileged signing without an authenticated owner", async () => {
    const store = { getCollection: vi.fn(), getRow: vi.fn() };
    const sign = vi.fn();
    expect((await resolveMargotMedia({ ownerId: null, collectionId: undefined, store, request: {}, sign })).status).toBe("unauthorised");
    expect(sign).not.toHaveBeenCalled(); expect(store.getCollection).not.toHaveBeenCalled();
  });
  it("rejects arbitrary object keys supplied by a client before signing", async () => {
    const store = { getCollection: vi.fn(), getRow: vi.fn() };
    const sign = vi.fn();
    expect((await resolveMargotMedia({ ownerId: "owner", collectionId: undefined, store, request: { objectPath: "another-owner/private.mp4" }, sign })).status).toBe("invalid");
    expect(sign).not.toHaveBeenCalled(); expect(store.getCollection).not.toHaveBeenCalled();
  });
});
import source from "./margot-first-five.fixture.json";
import { exportMargotPrivatePacket } from "../margot-packet-ingestion.operator";
import { packetDigest } from "../margot-packet";
import { MARGOT_COLLECTION_MARKER } from "../margot-private-storage";
function playbackFixture() {
  const ownerId = "11111111-1111-4111-8111-111111111111", collectionId = "22222222-2222-4222-8222-222222222222", rowId = "33333333-3333-4333-8333-333333333333";
  const packet = exportMargotPrivatePacket(source); const media = packet.episodes[0].media;
  if (media.kind === "awaiting_render") throw new Error("Rendered fixture required");
  media.asset = { sha256: "a".repeat(64), bucket: "media-uploads", objectPath: `${ownerId}/margot/${"a".repeat(64)}.mp4`, rendition: "captioned_mp4" };
  const active = { rowId, batchId: "synthetic", version: 1, packetSHA256: packetDigest(packet) };
  const pointer = { id: collectionId, owner_id: ownerId, database_id: collectionId, archived_at: null, cells: { kind: "margot-weekly-active-pointer", schemaVersion: 1, revision: 1, active } };
  const version = { id: rowId, owner_id: ownerId, database_id: collectionId, archived_at: null, cells: { kind: "margot-weekly-packet", schemaVersion: 1, batchId: active.batchId, version: 1, packetSHA256: active.packetSHA256, sourceManifestSHA256: "b".repeat(64), packet } };
  const store = { getCollection: vi.fn(async () => ({ data: { id: collectionId, owner_id: ownerId, name: "Synthetic", description: MARGOT_COLLECTION_MARKER }, error: null })), getRow: vi.fn(async (_owner: string, _collection: string, id: string) => ({ data: id === collectionId ? pointer : version, error: null })) };
  const request = { episodeId: packet.episodes[0].id, batchId: active.batchId, version: 1, packetSHA256: active.packetSHA256 };
  const sign = vi.fn<(_: "media-uploads", path: string) => Promise<string | null>>(async () => "https://synthetic.example/private-signed");
  return { ownerId, collectionId, packet, pointer, version, store, request, sign };
}
it("signs only the current owner's hash-keyed rendition", async () => {
  const f = playbackFixture(); expect((await resolveMargotMedia(f)).status).toBe("available");
  expect(f.sign).toHaveBeenCalledExactlyOnceWith("media-uploads", `${f.ownerId}/margot/${"a".repeat(64)}.mp4`);
});
it("never signs a stale version even when the digest has not changed", async () => {
  const f = playbackFixture(); f.request.version = 2;
  expect((await resolveMargotMedia(f)).status).toBe("stale"); expect(f.sign).not.toHaveBeenCalled();
});
it("never signs another owner's returned collection", async () => {
  const f = playbackFixture(); f.store.getCollection.mockResolvedValue({ data: { id: f.collectionId, owner_id: "other", name: "Synthetic", description: MARGOT_COLLECTION_MARKER }, error: null });
  expect((await resolveMargotMedia(f)).status).toBe("unavailable"); expect(f.sign).not.toHaveBeenCalled();
});
it("reports missing objects/signing failures without a URL", async () => {
  const f = playbackFixture(); f.sign.mockResolvedValue(null);
  expect(await resolveMargotMedia(f)).toEqual({ status: "unavailable" });
});
it("does not return a signed URL when the pointer switches during signing", async () => {
  const f = playbackFixture(); f.sign.mockImplementation(async () => { f.pointer.cells.active.version = 2; return "https://synthetic.example/private-signed"; });
  expect(await resolveMargotMedia(f)).toEqual({ status: "stale" });
});
