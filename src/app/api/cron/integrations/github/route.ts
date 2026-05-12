// src/app/api/cron/integrations/github/route.ts
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { syncGitHub } from "@/lib/integrations/github/sync";

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
  await sb.from("integration_sync_state").upsert({
    integration: "github",
    last_sync_started_at: start,
    last_sync_status: "running",
  });

  try {
    const { rowsUpserted } = await syncGitHub();
    await sb.from("integration_sync_state").upsert({
      integration: "github",
      last_sync_completed_at: new Date().toISOString(),
      last_sync_status: "ok",
      rows_upserted: rowsUpserted,
      last_sync_error: null,
      next_sync_due_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    return NextResponse.json({ ok: true, rowsUpserted });
  } catch (e) {
    await sb.from("integration_sync_state").upsert({
      integration: "github",
      last_sync_completed_at: new Date().toISOString(),
      last_sync_status: "error",
      last_sync_error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
