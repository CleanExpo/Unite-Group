import "server-only";
import {
  margotUUID,
  pointerSchema,
  envelopeSchema,
  ownsCollection,
  ownsRow,
  createMargotReadStore,
  type MargotReadStore,
  type MargotLiveDatabase,
} from "./margot-private-storage";
export { MARGOT_COLLECTION_MARKER } from "./margot-private-storage";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  packetDigest,
  parseMargotPrivatePacket,
  type MargotPrivatePacket,
} from "./margot-packet";

export type MargotPrivateReview =
  | { source: "not_configured" | "unavailable" | "invalid" | "missing" }
  | {
      source: "available";
      packet: MargotPrivatePacket;
      batchId: string;
      version: number;
      packetSHA256: string;
      calendar: "current" | "stale" | "future";
    };

export async function readMargotPrivatePacket(input: {
  ownerId: string | null;
  collectionId?: string;
  store: MargotReadStore;
  now?: Date;
}): Promise<MargotPrivateReview> {
  const { ownerId, collectionId, store } = input;
  if (!ownerId) return { source: "unavailable" };
  if (collectionId === undefined) return { source: "not_configured" };
  if (!margotUUID.safeParse(collectionId).success) return { source: "invalid" };
  try {
    const collection = await store.getCollection(ownerId, collectionId);
    if (collection.error) return { source: "unavailable" };
    if (!collection.data) return { source: "missing" };
    if (!ownsCollection(collection.data, ownerId, collectionId))
      return { source: "invalid" };
    const pointer = await store.getRow(ownerId, collectionId, collectionId);
    if (pointer.error) return { source: "unavailable" };
    if (!pointer.data) return { source: "missing" };
    if (!ownsRow(pointer.data, ownerId, collectionId, collectionId))
      return { source: "invalid" };
    const parsedPointer = pointerSchema.safeParse(pointer.data.cells);
    if (
      !parsedPointer.success ||
      parsedPointer.data.active.rowId === collectionId
    )
      return { source: "invalid" };
    const active = parsedPointer.data.active;
    const row = await store.getRow(ownerId, collectionId, active.rowId);
    if (row.error) return { source: "unavailable" };
    if (!row.data) return { source: "missing" };
    if (!ownsRow(row.data, ownerId, collectionId, active.rowId))
      return { source: "invalid" };
    const envelope = envelopeSchema.safeParse(row.data.cells);
    if (!envelope.success) return { source: "invalid" };
    const content = envelope.data;
    const parsed = parseMargotPrivatePacket(content.packet);
    if (
      !parsed.success ||
      content.batchId !== active.batchId ||
      content.version !== active.version ||
      content.packetSHA256 !== active.packetSHA256 ||
      packetDigest(parsed.data) !== active.packetSHA256
    )
      return { source: "invalid" };
    const now = (input.now ?? new Date()).getTime();
    if (!Number.isFinite(now)) return { source: "invalid" };
    const packet = parsed.data;
    const calendar =
      now < Date.parse(packet.reviewDueAt)
        ? "future"
        : now >= Date.parse(packet.reviewDueAt) + 7 * 86400000
          ? "stale"
          : "current";
    return {
      source: "available",
      packet,
      batchId: active.batchId,
      version: active.version,
      packetSHA256: active.packetSHA256,
      calendar,
    };
  } catch {
    return { source: "unavailable" };
  }
}

export async function loadMargotPrivateReview(): Promise<MargotPrivateReview> {
  try {
    const user = await getUser();
    if (!user) return { source: "unavailable" };
    const collectionId = process.env.MARGOT_WEEKLY_COLLECTION_ID;
    if (collectionId === undefined) return { source: "not_configured" };
    if (!margotUUID.safeParse(collectionId).success)
      return { source: "invalid" };
    const client = await createClient();
    return readMargotPrivatePacket({
      ownerId: user.id,
      collectionId,
      store: createMargotReadStore(
        client as unknown as SupabaseClient<MargotLiveDatabase>,
      ),
    });
  } catch {
    return { source: "unavailable" };
  }
}
