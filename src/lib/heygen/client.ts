/**
 * HeyGen API Client — SYN-573
 * Handles avatar video generation via HeyGen v2 API.
 * Auth: HEYGEN_API_KEY env var (X-Api-Key header).
 *
 * HeyGen videos are async: generateVideo() returns a video_id,
 * then poll getVideoStatus() or use waitForCompletion().
 */

const HEYGEN_BASE_URL = "https://api.heygen.com"

// Estimated cost per minute of generated video (USD).
// Adjust when pricing tier changes.
export const HEYGEN_COST_PER_MINUTE_USD = 0.07

export interface HeyGenAvatarConfig {
  avatar_id: string
  avatar_style?: "normal" | "circle" | "closeUp"
}

export interface HeyGenVoiceConfig {
  type: "text"
  voice_id: string
  input_text: string
  speed?: number // 0.5–2.0, default 1.0
}

export interface HeyGenVideoInput {
  character: HeyGenAvatarConfig
  voice: HeyGenVoiceConfig
  background?: {
    type: "color" | "image" | "video"
    value: string // hex colour, URL, or asset ID
  }
}

export interface HeyGenGenerateParams {
  video_inputs: HeyGenVideoInput[]
  dimension?: {
    width: number
    height: number
  }
  title?: string
  callback_id?: string
}

export type HeyGenVideoStatus =
  | "pending"
  | "processing"
  | "waiting"
  | "failed"
  | "completed"

export interface HeyGenStatusResponse {
  video_id: string
  status: HeyGenVideoStatus
  video_url?: string
  thumbnail_url?: string
  duration?: number // seconds
  error?: string
}

export interface HeyGenGenerateResponse {
  video_id: string
  status: HeyGenVideoStatus
}

export class HeyGenError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number
  ) {
    super(message)
    this.name = "HeyGenError"
  }
}

function getApiKey(): string {
  const key = process.env.HEYGEN_API_KEY
  if (!key) {
    throw new HeyGenError(
      "HEYGEN_API_KEY env var is not set",
      "MISSING_API_KEY"
    )
  }
  return key
}

async function heygenFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${HEYGEN_BASE_URL}${path}`
  const apiKey = getApiKey()

  const response = await fetch(url, {
    ...options,
    headers: {
      "X-Api-Key": apiKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    let errorMessage = `HeyGen API error ${response.status}`
    try {
      const body = (await response.json()) as { message?: string; error?: string }
      errorMessage = body.message ?? body.error ?? errorMessage
    } catch {
      // ignore parse failure
    }
    throw new HeyGenError(errorMessage, "API_ERROR", response.status)
  }

  const json = await response.json() as { data?: T; error?: string }
  if (json.error) {
    throw new HeyGenError(json.error, "API_ERROR")
  }
  return (json.data ?? json) as T
}

/**
 * Submit a video generation job.
 * Returns immediately with a video_id — the job is async.
 */
export async function generateVideo(
  params: HeyGenGenerateParams
): Promise<HeyGenGenerateResponse> {
  return heygenFetch<HeyGenGenerateResponse>("/v2/video/generate", {
    method: "POST",
    body: JSON.stringify({
      video_inputs: params.video_inputs,
      dimension: params.dimension ?? { width: 1280, height: 720 },
      title: params.title,
      callback_id: params.callback_id,
    }),
  })
}

/**
 * Poll for video status by video_id.
 */
export async function getVideoStatus(
  videoId: string
): Promise<HeyGenStatusResponse> {
  return heygenFetch<HeyGenStatusResponse>(
    `/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`
  )
}

/**
 * Poll until the video is completed or failed, up to timeoutMs.
 * Default timeout: 10 minutes.
 */
export async function waitForCompletion(
  videoId: string,
  timeoutMs = 10 * 60 * 1000,
  pollIntervalMs = 5000
): Promise<HeyGenStatusResponse> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const status = await getVideoStatus(videoId)

    if (status.status === "completed" || status.status === "failed") {
      return status
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new HeyGenError(
    `Video ${videoId} did not complete within ${timeoutMs / 1000}s`,
    "TIMEOUT"
  )
}

/**
 * Estimate cost in USD for a given video duration.
 */
export function estimateCostUsd(durationSeconds: number): number {
  return (durationSeconds / 60) * HEYGEN_COST_PER_MINUTE_USD
}
