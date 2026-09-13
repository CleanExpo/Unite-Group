import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, getUser } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createMargotReadStore, type MargotLiveDatabase } from "./margot-private-storage";
import { readContentEvents, type ContentReviewStore } from "./margot-content-review";
export function createContentReviewStore(client: SupabaseClient<MargotLiveDatabase>): ContentReviewStore {
  const reader = createMargotReadStore(client);
  return {
    ...reader,
    getEvent: reader.getRow,
    async insertEvent(row) { return await client.from("nexus_rows").insert(row); },
    async listEvents(ownerId, collectionId, current) {
      const response = await client.from("nexus_rows").select("id,owner_id,database_id,cells,archived_at")
        .eq("owner_id", ownerId).eq("database_id", collectionId).is("archived_at", null)
        .eq("cells->>kind", "margot-content-review-event")
        .eq("cells->>batchId", current.batchId).eq("cells->>version", String(current.version))
        .eq("cells->>packetSHA256", current.packetSHA256).limit(1001);
      if (response.error || (response.data?.length ?? 0) > 1000) return { data: null, error: new Error("Review history unavailable") };
      return response;
    },
  };
}
/** Temporary bearer access. Never called until session/owner/current packet checks pass. */
export async function signPrivateMargotMedia(bucket: "media-uploads", objectPath: string) {
  const storage = createServiceClient().storage;
  const { data, error } = await storage.from(bucket).createSignedUrl(objectPath, 300);
  return error ? null : data?.signedUrl ?? null;
}
export async function loadMargotContentEvents() {
  try {
    const user = await getUser();
    const collectionId = process.env.MARGOT_WEEKLY_COLLECTION_ID;
    if (!user || !collectionId) return { status: "unavailable" as const };
    const client = await createClient();
    return await readContentEvents({ ownerId: user.id, collectionId, store: createContentReviewStore(client as unknown as SupabaseClient<MargotLiveDatabase>) });
  } catch { return { status: "unavailable" as const }; }
}
