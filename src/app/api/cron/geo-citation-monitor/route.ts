/**
 * GEO Citation Monitor Cron Route — SYN-584
 * Called by Vercel Cron: Sunday 03:00 AEST (0 17 * * 6 UTC)
 *
 * Dark run: no client-facing output. Sprint 4 only.
 */

import { NextResponse } from "next/server"
import { runWeeklyGEOCitationMonitor } from "@/lib/geo-citation/run-weekly-monitor"

// Only accept requests from Vercel Cron (internal secret)
function isAuthorised(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    // In development: allow without auth
    return process.env.NODE_ENV === "development"
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  console.log("[cron/geo-citation-monitor] Starting")

  try {
    const result = await runWeeklyGEOCitationMonitor()

    console.log("[cron/geo-citation-monitor] Complete:", result)

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("[cron/geo-citation-monitor] Failed:", message)

    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
