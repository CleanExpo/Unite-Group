// src/app/api/cron/integrations/digitalocean/route.ts
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncDigitalOcean } from "@/lib/integrations/digitalocean/sync";

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
      { integration: "digitalocean" },
      { onConflict: "integration", ignoreDuplicates: true }
    );

  await sb
    .from("integration_sync_state")
    .update({
      last_sync_started_at: start,
      last_sync_status: "running",
    })
    .eq("integration", "digitalocean");

  try {
    const { rowsUpserted, succeeded, failed } = await syncDigitalOcean();
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
        next_sync_due_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      })
      .eq("integration", "digitalocean");
    return NextResponse.json({ ok: true, rowsUpserted, succeeded, failed });
  } catch (e) {
    await sb
      .from("integration_sync_state")
      .update({
        last_sync_completed_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: e instanceof Error ? e.message : String(e),
      })
      .eq("integration", "digitalocean");
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
