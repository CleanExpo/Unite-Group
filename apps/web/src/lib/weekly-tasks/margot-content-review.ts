import { createHash } from "node:crypto";
import { canonicalPacketJSON, packetDigest } from "./margot-packet";
import { readMargotPrivatePacket } from "./margot-packet-reader";
import { ownsRow, type MargotReadStore, type MargotRow, type ReadResult } from "./margot-private-storage";

import { reviewRequestSchema, contentEventSchema, type ContentEvent } from "./margot-content-review-contract";
export { reviewRequestSchema } from "./margot-content-review-contract";
export interface ContentReviewStore extends MargotReadStore {
  getEvent(ownerId: string, collectionId: string, id: string): Promise<ReadResult<unknown>>;
  insertEvent(row: MargotRow): Promise<{ error: unknown }>;
  listEvents(ownerId: string, collectionId: string, current: { batchId: string; version: number; packetSHA256: string }): Promise<ReadResult<unknown[]>>;
}
export type ContentReviewResult = { status: "saved"; event: ContentEvent } | {
  status: "unauthorised" | "invalid" | "stale" | "conflict" | "media_unavailable" | "unavailable";
};
function semantic(event: ContentEvent) {
  const { recordedAt: _recordedAt, ...payload } = event;
  return canonicalPacketJSON(payload);
}
function eventFromRow(value: unknown, ownerId: string, collectionId: string, id: string) {
  if (!value || typeof value !== "object") return null;
  const row = value as MargotRow;
  if (!ownsRow(row, ownerId, collectionId, id)) return null;
  const parsed = contentEventSchema.safeParse(row.cells);
  return parsed.success && parsed.data.operationId === id ? parsed.data : null;
}
export async function saveMargotContentReview(input: {
  ownerId: string | null; collectionId?: string; store: ContentReviewStore; body: unknown;
  canPlay?: (episode: unknown, ownerId: string) => Promise<boolean>;
}): Promise<ContentReviewResult> {
  const { ownerId, collectionId, store } = input;
  if (!ownerId) return { status: "unauthorised" };
  const parsed = reviewRequestSchema.safeParse(input.body);
  if (!parsed.success) return { status: "invalid" };
  const request = parsed.data;
  try {
    const review = await readMargotPrivatePacket({ ownerId, collectionId, store });
    if (review.source !== "available" || !collectionId) return { status: "unavailable" };
    if (review.batchId !== request.batchId || review.version !== request.version || review.packetSHA256 !== request.packetSHA256) return { status: "stale" };
    const episode = review.packet.episodes.find(e => e.id === request.episodeId);
    if (!episode || request.operationId === collectionId) return { status: "invalid" };
    const media = episode.media as typeof episode.media & { asset?: { sha256: string } };
    if (request.action === "approve" && (!media.asset || !input.canPlay || !await input.canPlay(episode, ownerId))) return { status: "media_unavailable" };
    const intended: ContentEvent = {
      kind: "margot-content-review-event", schemaVersion: 1, ...request,
      episodeSHA256: packetDigest(episode), scriptSHA256: createHash("sha256").update(episode.script, "utf8").digest("hex"),
      mediaSHA256: media.asset?.sha256 ?? null,
      videoId: "videoId" in media ? media.videoId : null,
      recordedAt: new Date().toISOString(), publicationApproved: false,
    };
    const previous = await store.getEvent(ownerId, collectionId, request.operationId);
    if (previous.error) return { status: "unavailable" };
    if (previous.data) {
      const event = eventFromRow(previous.data, ownerId, collectionId, request.operationId);
      if (!event || semantic(event) !== semantic(intended)) return { status: "conflict" };
    } else {
      // Insert once. Uncertain responses are reconciled by exact readback, never upsert.
      try { await store.insertEvent({ id: request.operationId, owner_id: ownerId, database_id: collectionId, archived_at: null, cells: intended }); } catch { /* Readback resolves uncertainty below. */ }
    }
    const saved = await store.getEvent(ownerId, collectionId, request.operationId);
    const event = saved.error ? null : eventFromRow(saved.data, ownerId, collectionId, request.operationId);
    if (!event || semantic(event) !== semantic(intended)) return { status: "unavailable" };
    const current = await readMargotPrivatePacket({ ownerId, collectionId, store });
    // A racing packet switch may leave a historical event; it never approves new bytes.
    if (current.source !== "available") return { status: "stale" };
    if (current.packetSHA256 !== request.packetSHA256 || current.version !== request.version || current.batchId !== request.batchId) return { status: "stale" };
    return { status: "saved", event };
  } catch { return { status: "unavailable" }; }
}

export async function readContentEvents(input: { ownerId: string; collectionId: string; store: ContentReviewStore }) {
  try {
    const review = await readMargotPrivatePacket(input);
    if (review.source !== "available") return { status: "unavailable" as const };
    const rows = await input.store.listEvents(input.ownerId, input.collectionId, { batchId: review.batchId, version: review.version, packetSHA256: review.packetSHA256 });
    if (rows.error || !rows.data) return { status: "unavailable" as const };
    const events: Record<string, ContentEvent> = {};
    for (const row of rows.data) {
      if (!row || typeof row !== "object" || !("id" in row) || typeof row.id !== "string") return { status: "unavailable" as const };
      const event = eventFromRow(row, input.ownerId, input.collectionId, row.id);
      if (!event) return { status: "unavailable" as const };
      const episode = review.packet.episodes.find(e => e.id === event.episodeId);
      if (!episode || event.packetSHA256 !== review.packetSHA256 || event.batchId !== review.batchId || event.version !== review.version || event.episodeSHA256 !== packetDigest(episode)) continue;
      const previous = events[event.episodeId];
      const media = episode.media as typeof episode.media & { asset?: { sha256: string } };
      if (event.scriptSHA256 !== createHash("sha256").update(episode.script, "utf8").digest("hex") || event.mediaSHA256 !== (media.asset?.sha256 ?? null) || event.videoId !== ("videoId" in media ? media.videoId : null)) return { status: "unavailable" as const };
      if (!previous || `${event.recordedAt}/${event.operationId}` > `${previous.recordedAt}/${previous.operationId}`) events[event.episodeId] = event;
    }
    const current = await readMargotPrivatePacket(input);
    if (current.source !== "available" || current.batchId !== review.batchId || current.version !== review.version || current.packetSHA256 !== review.packetSHA256) return { status: "unavailable" as const };
    return { status: "available" as const, events, packetSHA256: review.packetSHA256, batchId: review.batchId, version: review.version };
  } catch { return { status: "unavailable" as const }; }
}
