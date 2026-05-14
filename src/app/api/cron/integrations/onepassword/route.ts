// src/app/api/cron/integrations/onepassword/route.ts
//
// NOTE: this route is NOT registered in vercel.json. The 1Password sync
// uses the `op` CLI which doesn't exist in Vercel serverless. It runs
// instead from a Hermes cron on the Mac mini (where `op` is installed).
// Follow-up: ~/.hermes/scripts/sync_1password_to_supabase.py + Hermes cron
// "Unite-Group 1Password sync" at daily 04:00 AEST.
//
// This route is kept so the 1Password Connect path (when OP_CONNECT_HOST
// + OP_CONNECT_TOKEN are configured) can be triggered manually via
// authenticated POST. It will not auto-fire from Vercel.
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncOnePassword } from "@/lib/integrations/onepassword/sync";
import { timingSafeBearerMatch } from "@/lib/security/safe-compare";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  // Vercel cron auth — Vercel sends a special header
  const auth = req.headers.get("authorization");
  if (!timingSafeBearerMatch(auth, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getAdminClient();
  const start = new Date().toISOString();

  // Seed the row on first run only — ignoreDuplicates means existing columns
  // (last_sync_completed_at, rows_upserted, ...) are preserved across cron ticks.
  await sb
    .from("integration_sync_state")
    .upsert(
      { integration: "onepassword" },
      { onConflict: "integration", ignoreDuplicates: true },
    );

  await sb
    .from("integration_sync_state")
    .update({
      last_sync_started_at: start,
      last_sync_status: "running",
    })
    .eq("integration", "onepassword");

  try {
    const { rowsUpserted, succeeded, failed } = await syncOnePassword();
    await sb
      .from("integration_sync_state")
      .update({
        last_sync_completed_at: new Date().toISOString(),
        last_sync_status: failed.length > 0 ? "partial" : "ok",
        rows_upserted: rowsUpserted,
        last_sync_error:
          failed.length > 0
            ? failed.map((e) => `${e.vault}: ${e.error}`).join("; ")
            : null,
        next_sync_due_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
      })
      .eq("integration", "onepassword");
    return NextResponse.json({ ok: true, rowsUpserted, succeeded, failed });
  } catch (e) {
    await sb
      .from("integration_sync_state")
      .update({
        last_sync_completed_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: e instanceof Error ? e.message : String(e),
      })
      .eq("integration", "onepassword");
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
