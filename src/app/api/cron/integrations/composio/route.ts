// src/app/api/cron/integrations/composio/route.ts
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncComposio } from "@/lib/integrations/composio/sync";
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
      { integration: "composio" },
      { onConflict: "integration", ignoreDuplicates: true }
    );

  await sb
    .from("integration_sync_state")
    .update({
      last_sync_started_at: start,
      last_sync_status: "running",
    })
    .eq("integration", "composio");

  try {
    const { rowsUpserted, succeeded, failed } = await syncComposio();
    await sb
      .from("integration_sync_state")
      .update({
        last_sync_completed_at: new Date().toISOString(),
        last_sync_status: failed.length > 0 ? "partial" : "ok",
        rows_upserted: rowsUpserted,
        last_sync_error:
          failed.length > 0
            ? failed.map((f) => `${f.entity}: ${f.error}`).join("; ")
            : null,
        // Hourly cadence — matches vercel.json schedule "0 * * * *".
        next_sync_due_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      })
      .eq("integration", "composio");
    return NextResponse.json({ ok: true, rowsUpserted, succeeded, failed });
  } catch (e) {
    await sb
      .from("integration_sync_state")
      .update({
        last_sync_completed_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: e instanceof Error ? e.message : String(e),
      })
      .eq("integration", "composio");
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
