/** Operator-only helper. No entrypoint, credentials, automatic import or web route.
 * Supply an authenticated session client only after the private write is reviewed.
 * Version retention is an application convention, not an append-only DB guarantee.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  canonicalPacketJSON,
  packetDigest,
  parseMargotPrivatePacket,
  type MargotPrivatePacket,
} from "./margot-packet";
import {
  createMargotReadStore,
  envelopeSchema,
  margotUUID,
  ownsCollection,
  ownsRow,
  pointerSchema,
  type MargotLiveDatabase,
  type MargotPointer,
  type MargotRow,
} from "./margot-private-storage";

export function exportMargotPrivatePacket(
  source: unknown,
): MargotPrivatePacket {
  const object = z.record(z.string(), z.unknown()).parse(source);
  const episodes = z
    .array(z.record(z.string(), z.unknown()))
    .length(5)
    .parse(object.episodes);
  const mapped = {
    schemaVersion: 2,
    releaseEligible: false,
    sourceDocument: "Private weekly editorial packet",
    weekStartsAt: object.weekStartsAt,
    reviewDueAt: object.reviewDueAt,
    timezone: object.timezone,
    scheduleStatus: object.scheduleStatus,
    reviewTimeStatus: object.reviewTimeStatus,
    distributionSystem: object.distributionSystem,
    primarySite: object.primarySite,
    optionalContextualSite: object.optionalContextualSite,
    episodes: episodes.map((item) => {
      const kind =
        item.productionStatus === "existing-owner-approved-master"
          ? "approved_reference"
          : item.productionStatus === "rendered-draft-pending-review"
            ? "generated_draft"
            : item.productionStatus === "script-draft-not-rendered"
              ? "awaiting_render"
              : null;
      if (!kind || (kind === "awaiting_render" && item.videoId !== undefined))
        throw new Error("Invalid source media state");
      return {
        id: item.id,
        title: item.title,
        slot: item.slot,
        timezone: item.timezone,
        script: item.script,
        caption: item.caption,
        resourceTitle: item.resourceTitle,
        resourceText: item.resourceText,
        scriptApproval: item.scriptApproval,
        releaseApproval: item.releaseApproval,
        media:
          kind === "awaiting_render"
            ? { kind }
            : { kind, videoId: item.videoId },
      };
    }),
  };
  const parsed = parseMargotPrivatePacket(mapped);
  if (!parsed.success)
    throw new Error("Private display packet validation failed");
  return parsed.data;
}

export async function ingestMargotPrivatePacket(input: {
  client: SupabaseClient<MargotLiveDatabase>;
  collectionId: string;
  rowId: string;
  batchId: string;
  version: number;
  sourcePacket: unknown;
  sourceManifestSHA256: string;
  expectedRevision: number | null;
}) {
  const { client, collectionId, rowId, expectedRevision } = input;
  if (
    !margotUUID.safeParse(collectionId).success ||
    !margotUUID.safeParse(rowId).success ||
    rowId === collectionId
  )
    throw new Error("Invalid collection/version identity");
  if (
    expectedRevision !== null &&
    (!Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 1 ||
      expectedRevision >= 2147483646)
  )
    throw new Error("Invalid expected pointer revision");
  const packet = exportMargotPrivatePacket(input.sourcePacket);
  const envelope = envelopeSchema.parse({
    kind: "margot-weekly-packet",
    schemaVersion: 1,
    batchId: input.batchId,
    version: input.version,
    packet,
    packetSHA256: packetDigest(packet),
    sourceManifestSHA256: input.sourceManifestSHA256,
  });
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error("Authentication required");
  const ownerId = auth.data.user.id;
  const store = createMargotReadStore(client);
  const collection = await store.getCollection(ownerId, collectionId);
  if (
    collection.error ||
    !collection.data ||
    !ownsCollection(collection.data, ownerId, collectionId)
  )
    throw new Error("Private collection unavailable or not owned");
  const previous = await store.getRow(ownerId, collectionId, collectionId);
  if (previous.error) throw new Error("Pointer read unavailable");
  let prior: MargotPointer | null = null;
  if (previous.data) {
    if (!ownsRow(previous.data, ownerId, collectionId, collectionId))
      throw new Error("Invalid pointer ownership");
    const parsed = pointerSchema.safeParse(previous.data.cells);
    if (!parsed.success || parsed.data.active.rowId === collectionId)
      throw new Error("Invalid pointer");
    prior = parsed.data;
  }
  const active = {
    rowId,
    batchId: input.batchId,
    version: input.version,
    packetSHA256: envelope.packetSHA256,
  };
  const intended = pointerSchema.parse({
    kind: "margot-weekly-active-pointer",
    schemaVersion: 1,
    revision: (expectedRevision ?? 0) + 1,
    active,
  });
  const alreadySelected =
    prior !== null &&
    canonicalPacketJSON(prior) === canonicalPacketJSON(intended);
  if (!alreadySelected && (prior?.revision ?? null) !== expectedRevision)
    throw new Error("Pointer revision conflict");

  const versionRow: MargotRow = {
    id: rowId,
    owner_id: ownerId,
    database_id: collectionId,
    archived_at: null,
    cells: envelope,
  };
  const existing = await store.getRow(ownerId, collectionId, rowId);
  if (existing.error) throw new Error("Version read unavailable");
  if (!existing.data) {
    // Insert once. On an uncertain response, read back before any further write.
    try {
      await client.from("nexus_rows").insert(versionRow).select("id");
    } catch {
      /* Read-back below resolves uncertainty. */
    }
  }
  const confirmed = await store.getRow(ownerId, collectionId, rowId);
  if (
    confirmed.error ||
    !confirmed.data ||
    !ownsRow(confirmed.data, ownerId, collectionId, rowId) ||
    canonicalPacketJSON(confirmed.data.cells) !== canonicalPacketJSON(envelope)
  )
    throw new Error("Version write unconfirmed or identity conflict");
  if (!alreadySelected) {
    if (prior === null) {
      // Bootstrap has the reserved unique ID; never upsert or replace a concurrent pointer.
      try {
        await client
          .from("nexus_rows")
          .insert({
            id: collectionId,
            owner_id: ownerId,
            database_id: collectionId,
            archived_at: null,
            cells: intended,
          })
          .select("id");
      } catch {
        /* Confirm the entire pointer below; never blindly repeat the insert. */
      }
    } else {
      let result;
      try {
        result = await client
          .from("nexus_rows")
          .update({ cells: intended })
          .eq("id", collectionId)
          .eq("owner_id", ownerId)
          .eq("database_id", collectionId)
          .is("archived_at", null)
          .eq("cells->>kind", "margot-weekly-active-pointer")
          .eq("cells->>revision", String(expectedRevision))
          .select("id");
      } catch {
        /* An uncertain network response is resolved by exact read-back below. */
      }
      if (result && !result.error && result.data?.length !== 1)
        throw new Error("Pointer revision conflict");
    }
  }
  const readBack = await store.getRow(ownerId, collectionId, collectionId);
  if (
    readBack.error ||
    !readBack.data ||
    !ownsRow(readBack.data, ownerId, collectionId, collectionId) ||
    canonicalPacketJSON(readBack.data.cells) !== canonicalPacketJSON(intended)
  )
    throw new Error("Pointer write unconfirmed or concurrent conflict");
  return {
    status: "confirmed" as const,
    rowId,
    batchId: input.batchId,
    version: input.version,
    packetSHA256: envelope.packetSHA256,
    sourceManifestSHA256: envelope.sourceManifestSHA256,
    pointerRevision: intended.revision,
    previousActive: alreadySelected ? null : (prior?.active ?? null),
    releaseEligible: false as const,
  };
}
