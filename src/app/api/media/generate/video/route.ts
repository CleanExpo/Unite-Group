/**
 * POST /api/media/generate/video — SYN-573
 * Submits an async HeyGen video generation job.
 *
 * Body:
 *   script        string   (required) — spoken text for the avatar
 *   avatar_id     string   (required) — HeyGen avatar ID
 *   voice_id      string   (required) — HeyGen voice ID
 *   title?        string   — label for the video in HeyGen dashboard
 *   client_id?    string   — for cost tracking
 *   dimension?    { width: number; height: number }  default 1280×720
 *
 * Returns:
 *   { ok: true, video_id: string, status: string }
 *   { ok: false, error: string }
 *
 * The video is async — poll GET /api/media/generate/video/status?video_id= to check completion.
 */

import { NextResponse } from "next/server"
import { generateVideo, HeyGenError } from "@/lib/heygen/client"
import { trackPipelineCost } from "@/lib/pipelines/track-cost"
import crypto from "crypto"

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    script,
    avatar_id,
    voice_id,
    title,
    client_id,
    dimension,
  } = body as {
    script?: string
    avatar_id?: string
    voice_id?: string
    title?: string
    client_id?: string
    dimension?: { width: number; height: number }
  }

  if (!script || !avatar_id || !voice_id) {
    return NextResponse.json(
      { ok: false, error: "script, avatar_id, and voice_id are required" },
      { status: 400 }
    )
  }

  const run_id = crypto.randomUUID()

  try {
    const result = await generateVideo({
      title: title ?? `Synthex Video ${new Date().toISOString().slice(0, 10)}`,
      dimension: dimension ?? { width: 1280, height: 720 },
      callback_id: run_id,
      video_inputs: [
        {
          character: { avatar_id, avatar_style: "normal" },
          voice: {
            type: "text",
            voice_id,
            input_text: script,
          },
          background: { type: "color", value: "#FFFFFF" },
        },
      ],
    })

    // Track submission cost (HeyGen charges on completion — log $0 now,
    // final cost is logged in the status/webhook handler when duration is known)
    await trackPipelineCost({
      pipeline_name: "heygen_video_generate",
      client_id: client_id ?? null,
      run_id,
      model: "heygen",
      input_tokens: script.length, // characters as proxy for input size
      output_tokens: 0,
      cost_usd: 0, // updated on completion
    })

    return NextResponse.json({
      ok: true,
      video_id: result.video_id,
      status: result.status,
      run_id,
    })
  } catch (error) {
    if (error instanceof HeyGenError) {
      const status = error.status ?? 500
      return NextResponse.json({ ok: false, error: error.message }, { status })
    }
    const message = error instanceof Error ? error.message : String(error)
    console.error("[api/media/generate/video] Unexpected error:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
