/**
 * GET /api/media/generate/video/status?video_id={id} — SYN-573
 * Polls HeyGen for video completion status.
 *
 * Returns:
 *   { ok: true, video_id, status, video_url?, thumbnail_url?, duration? }
 *   { ok: false, error: string }
 */

import { NextResponse } from "next/server"
import { getVideoStatus, estimateCostUsd, HeyGenError } from "@/lib/heygen/client"
import { trackPipelineCost } from "@/lib/pipelines/track-cost"
import crypto from "crypto"

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const video_id = searchParams.get("video_id")
  const client_id = searchParams.get("client_id") ?? undefined

  if (!video_id) {
    return NextResponse.json(
      { ok: false, error: "video_id query param is required" },
      { status: 400 }
    )
  }

  try {
    const status = await getVideoStatus(video_id)

    // On first completed poll, log the actual cost
    if (status.status === "completed" && status.duration) {
      await trackPipelineCost({
        pipeline_name: "heygen_video_completed",
        client_id: client_id ?? null,
        run_id: crypto.randomUUID(),
        model: "heygen",
        input_tokens: 0,
        output_tokens: Math.round(status.duration), // seconds as proxy
        cost_usd: estimateCostUsd(status.duration),
      })
    }

    return NextResponse.json({
      ok: true,
      video_id: status.video_id,
      status: status.status,
      video_url: status.video_url ?? null,
      thumbnail_url: status.thumbnail_url ?? null,
      duration: status.duration ?? null,
      error: status.error ?? null,
    })
  } catch (error) {
    if (error instanceof HeyGenError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status ?? 500 }
      )
    }
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
