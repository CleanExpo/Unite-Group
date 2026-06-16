import { getAdminClient } from "@/lib/supabase/admin";
import type { SyncResult, SyncStatus } from "@/lib/runtime/types";

const TABLE = "integration_sync_state";

export async function seedRow(integration: string): Promise<void> {
  await getAdminClient()
    .from(TABLE)
    .upsert(
      { integration },
      { onConflict: "integration", ignoreDuplicates: true },
    );
}

export async function markRunning(integration: string): Promise<void> {
  await getAdminClient()
    .from(TABLE)
    .update({
      last_sync_started_at: new Date().toISOString(),
      last_sync_status: "running",
    })
    .eq("integration", integration);
}

export async function markCompleted<F>(
  integration: string,
  result: SyncResult<F>,
  status: SyncStatus,
  nextDueAt: Date,
  errorString: string | null,
): Promise<void> {
  await getAdminClient()
    .from(TABLE)
    .update({
      last_sync_completed_at: new Date().toISOString(),
      last_sync_status: status,
      rows_upserted: result.rowsUpserted,
      last_sync_error: errorString,
      next_sync_due_at: nextDueAt.toISOString(),
    })
    .eq("integration", integration);
}

export async function markErrored(
  integration: string,
  err: unknown,
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  await getAdminClient()
    .from(TABLE)
    .update({
      last_sync_completed_at: new Date().toISOString(),
      last_sync_status: "error",
      last_sync_error: message,
    })
    .eq("integration", integration);
}
