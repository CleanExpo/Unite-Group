// src/app/api/cron/integrations/linear/route.ts
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncLinear } from "@/lib/integrations/linear/sync";

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
      { integration: "linear" },
      { onConflict: "integration", ignoreDuplicates: true }
    );

  await sb
    .from("integration_sync_state")
    .update({
      last_sync_started_at: start,
      last_sync_status: "running",
    })
    .eq("integration", "linear");

  try {
    const { rowsUpserted, succeeded, failed } = await syncLinear();
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
        next_sync_due_at: new Date(Date.now() + 5 * 60_000).toISOString(),
      })
      .eq("integration", "linear");
    return NextResponse.json({ ok: true, rowsUpserted, succeeded, failed });
  } catch (e) {
    const errMsg = `${(e as Error)?.message ?? String(e)}`;
    await sb
      .from("integration_sync_state")
      .update({
        last_sync_completed_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: errMsg,
      })
      .eq("integration", "linear");
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
