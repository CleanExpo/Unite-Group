// src/app/api/cron/integrations/stripe/route.ts
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncStripe } from "@/lib/integrations/stripe/sync";

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
      { integration: "stripe" },
      { onConflict: "integration", ignoreDuplicates: true }
    );

  await sb
    .from("integration_sync_state")
    .update({
      last_sync_started_at: start,
      last_sync_status: "running",
    })
    .eq("integration", "stripe");

  try {
    const { rowsUpserted, succeeded, failed } = await syncStripe();
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
      .eq("integration", "stripe");
    return NextResponse.json({ ok: true, rowsUpserted, succeeded, failed });
  } catch (e: unknown) {
    const err = e as { message?: string };
    await sb
      .from("integration_sync_state")
      .update({
        last_sync_completed_at: new Date().toISOString(),
        last_sync_status: "error",
        last_sync_error: `${err.message ?? String(e)}`,
      })
      .eq("integration", "stripe");
    return NextResponse.json(
      { ok: false, error: `${err.message ?? String(e)}` },
      { status: 500 }
    );
  }
}
