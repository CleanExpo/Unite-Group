// src/lib/integrations/composio/sync.ts
import { getAdminClient } from "@/lib/supabase/admin";
import { listConnections } from "./client";

export async function syncComposio(): Promise<{
  rowsUpserted: number;
  succeeded: string[];
  failed: Array<{ entity: string; error: string }>;
}> {
  const sb = getAdminClient();
  let total = 0;
  const succeeded: string[] = [];
  const failed: Array<{ entity: string; error: string }> = [];

  const conns = await listConnections();

  for (const c of conns) {
    try {
      await sb.from("integration_composio_connections").upsert(
        {
          id: c.id,
          toolkit_slug: c.appName,
          user_email: c.member?.email ?? null,
          status: c.status,
          last_used_at: c.lastUsedAt ?? null,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
      total++;
      succeeded.push(c.id);
    } catch (e) {
      failed.push({
        entity: c.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { rowsUpserted: total, succeeded, failed };
}
