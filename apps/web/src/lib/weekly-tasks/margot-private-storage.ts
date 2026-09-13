import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MARGOT_COLLECTION_MARKER = "unite:margot-private-weekly-review:v1";
export const margotUUID = z.string().uuid();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const activeReferenceSchema = z
  .object({
    rowId: margotUUID,
    batchId: z.string().min(1).max(160),
    version: z.number().int().positive().max(2147483646),
    packetSHA256: digest,
  })
  .strict();
export const pointerSchema = z
  .object({
    kind: z.literal("margot-weekly-active-pointer"),
    schemaVersion: z.literal(1),
    revision: z.number().int().positive().max(2147483646),
    active: activeReferenceSchema,
  })
  .strict();
export const envelopeSchema = z
  .object({
    kind: z.literal("margot-weekly-packet"),
    schemaVersion: z.literal(1),
    batchId: z.string().min(1).max(160),
    version: z.number().int().positive().max(2147483646),
    packet: z.unknown(),
    packetSHA256: digest,
    sourceManifestSHA256: digest,
  })
  .strict();
export type MargotPointer = z.infer<typeof pointerSchema>;
export type MargotCollection = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
};
export type MargotRow = {
  id: string;
  owner_id: string;
  database_id: string;
  cells: unknown;
  archived_at: string | null;
};
export type ReadResult<T> = { data: T | null; error: unknown };
export interface MargotReadStore {
  getCollection(
    ownerId: string,
    collectionId: string,
  ): Promise<ReadResult<MargotCollection>>;
  getRow(
    ownerId: string,
    collectionId: string,
    rowId: string,
  ): Promise<ReadResult<MargotRow>>;
}
// Local live-table types intentionally supersede stale generated founder_id/properties
// types for these two queries only. The client remains the caller's session/RLS client.
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};
export type MargotLiveDatabase = {
  public: {
    Tables: {
      nexus_databases: Table<MargotCollection>;
      nexus_rows: Table<MargotRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
export function createMargotReadStore(
  client: SupabaseClient<MargotLiveDatabase>,
): MargotReadStore {
  return {
    async getCollection(ownerId, collectionId) {
      return await client
        .from("nexus_databases")
        .select("id,owner_id,name,description")
        .eq("id", collectionId)
        .eq("owner_id", ownerId)
        .maybeSingle();
    },
    async getRow(ownerId, collectionId, rowId) {
      return await client
        .from("nexus_rows")
        .select("id,owner_id,database_id,cells,archived_at")
        .eq("id", rowId)
        .eq("database_id", collectionId)
        .eq("owner_id", ownerId)
        .is("archived_at", null)
        .maybeSingle();
    },
  };
}
export function ownsCollection(
  value: MargotCollection,
  ownerId: string,
  collectionId: string,
) {
  return (
    value.id === collectionId &&
    value.owner_id === ownerId &&
    value.description === MARGOT_COLLECTION_MARKER
  );
}
export function ownsRow(
  value: MargotRow,
  ownerId: string,
  collectionId: string,
  rowId: string,
) {
  return (
    value.id === rowId &&
    value.owner_id === ownerId &&
    value.database_id === collectionId &&
    value.archived_at === null
  );
}
