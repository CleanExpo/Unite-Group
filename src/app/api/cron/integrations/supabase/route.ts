// src/app/api/cron/integrations/supabase/route.ts
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncSupabase } from "@/lib/integrations/supabase/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  // Vercel cron auth — Vercel sends a special header
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getAdminClient();
  const start = new Date().toISOString();

  // Seed the row on first run only — ignoreDuplicates means existing columns
  // (last_sync_completed_at, rows_upserted, ...) are preserved across cron ticks.
  await sb
    .from("integration_sync_state")
    .upsert(
      { integration: "supabase" },
      { onConflict: "integration", ignoreDuplicates: true },
    );

  await sb
    .from("integration_sync_state")
    .update({
      last_sync_started_at: start,
      last_sync_status: "running",
    })
    .eq("integration", "supabase");

  try {
    const { rowsUpserted, succeeded, failed } = await syncSupabase();
    await sb
      .from("integration_sync_state")
      .update({
        last_sync_completed_at: new Date().toISOString(),
        last_sync_status: failed.length > 0 ? "partial" : "ok",
        rows_upserted: rowsUpserted,
        last_sync_error:
          failed.length > 0
            ? failed.map((f) => `${f.project}: ${f.error}`).join("; ")
            : null,
        next_sync_due_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      })
      .eq("integration", "supabase");
    return NextResponse.json({ ok: true, rowsUpserted, succeeded, failed });
  } catch (e) {
    await sb
      .from("integration_sync_state")
      .update({
        last_sync_completed_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: e instanceof Error ? e.message : String(e),
      })
      .eq("integration", "supabase");
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
