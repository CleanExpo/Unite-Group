// src/lib/integrations/onepassword/sync.ts
import { getAdminClient } from "@/lib/supabase/admin";
import {
  configuredVaults,
  hasConnect,
  listConnectVaults,
  listItemsInVaultViaCli,
  listItemsInVaultViaConnect,
  type OPItemIndex,
} from "./client";

export async function syncOnePassword(): Promise<{
  rowsUpserted: number;
  succeeded: string[];
  failed: Array<{ vault: string; error: string }>;
}> {
  const sb = getAdminClient();
  let total = 0;
  const succeeded: string[] = [];
  const failed: Array<{ vault: string; error: string }> = [];

  const vaultNames = configuredVaults();
  if (vaultNames.length === 0) {
    console.warn("[onepassword] no vaults configured — skipping sync");
    return { rowsUpserted: 0, succeeded, failed };
  }

  // Use ONE run timestamp for every row written this cycle so the post-insert
  // sweep can target only stale rows (avoids the DELETE-then-INSERT empty
  // window if two cron firings overlap).
  const runTimestamp = new Date().toISOString();

  // Resolve Connect vault id mapping once per run (only if Connect is
  // configured). CLI path operates by vault name directly.
  let connectVaultsByName: Map<string, { id: string; name: string }> | null = null;
  if (hasConnect()) {
    try {
      const vaults = await listConnectVaults();
      connectVaultsByName = new Map(vaults.map((v) => [v.name, v]));
    } catch (e) {
      // If we can't list vaults at all, every per-vault iteration will fail —
      // attribute that to a synthetic vault so the run records a clear error.
      failed.push({
        vault: "<connect-list>",
        error: e instanceof Error ? e.message : String(e),
      });
      connectVaultsByName = new Map();
    }
  }

  for (const vault of vaultNames) {
    try {
      let items: OPItemIndex[] = [];
      if (connectVaultsByName) {
        const vaultRef = connectVaultsByName.get(vault);
        if (!vaultRef) {
          throw new Error(`vault "${vault}" not found in 1Password Connect`);
        }
        items = await listItemsInVaultViaConnect(vaultRef);
      } else {
        items = await listItemsInVaultViaCli(vault);
      }

      const rows = items.map((it) => ({
        vault: it.vault,
        item_name: it.item_name,
        category: it.category,
        last_modified: it.last_modified,
        fetched_at: runTimestamp,
      }));

      if (rows.length === 0) {
        succeeded.push(vault);
        continue;
      }

      for (let i = 0; i < rows.length; i += 500) {
        await sb
          .from("integration_onepassword_index")
          .upsert(rows.slice(i, i + 500), { onConflict: "vault,item_name" });
      }
      total += rows.length;
      succeeded.push(vault);
    } catch (e) {
      failed.push({
        vault,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Sweep rows from vaults that no longer have a matching entry this run.
  // Full-refresh — no project filter. Only runs if at least one vault
  // succeeded; otherwise we'd wipe the entire index on a transient outage.
  if (succeeded.length > 0) {
    await sb
      .from("integration_onepassword_index")
      .delete()
      .lt("fetched_at", runTimestamp);
  }

  return { rowsUpserted: total, succeeded, failed };
}
