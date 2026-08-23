// src/lib/integrations/heygen.ts
// HeyGen API client — AI talking-head video generation

const HEYGEN_API = 'https://api.heygen.com'

function getApiKey(): string {
  const key = process.env.HEYGEN_API_KEY?.trim()
  if (!key) throw new Error('[HeyGen] HEYGEN_API_KEY not configured')
  return key
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface HeyGenVideoRequest {
  avatarId: string
  script: string
  voiceId?: string
  aspectRatio?: '16:9' | '9:16' | '1:1'
  title?: string
  idempotencyKey?: string
}

export interface HeyGenVideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl: string | null
  thumbnailUrl: string | null
  duration: number | null
  error: string | null
}

export interface HeyGenAvatar {
  avatarId: string
  avatarName: string
  gender: string
  previewUrl: string | null
}

// ── Internal helpers ─────────────────────────────────────────────────────────

interface HeyGenApiResponse<T> {
  data: T
  message?: string | null
  error?: string | { message?: string; code?: string } | null
}

async function heygenFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = getApiKey()

  const res = await fetch(`${HEYGEN_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      ...options.headers,
    },
  })

  const json = (await res.json()) as HeyGenApiResponse<T>

  if (!res.ok || json.error) {
    const msg = typeof json.error === 'string'
      ? json.error
      : json.error?.message ?? json.message ?? `HTTP ${res.status}`
    throw new Error(`[HeyGen] API error: ${msg}`)
  }

  return json.data
}

// ── Client Functions ─────────────────────────────────────────────────────────

/**
 * Create a talking-head video via HeyGen's Video Generation API v3.
 * Returns the video_id which can be polled via getVideoStatus().
 *
 * HeyGen API: POST https://api.heygen.com/v3/videos
 */
export async function createTalkingHeadVideo(
  request: HeyGenVideoRequest,
): Promise<string> {
  const { avatarId, script, voiceId, aspectRatio = '9:16', title, idempotencyKey } = request

  const body = {
    type: 'avatar',
    avatar_id: avatarId,
    script,
    aspect_ratio: aspectRatio,
    output_format: 'mp4',
    caption: { file_format: 'srt', style: 'default' },
    ...(voiceId ? { voice_id: voiceId } : {}),
    ...(title ? { title } : {}),
  }

  const data = await heygenFetch<{ video_id: string }>(
    '/v3/videos',
    {
      method: 'POST',
      body: JSON.stringify(body),
      ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
    },
  )

  return data.video_id
}

/**
 * Check the status of a HeyGen video generation job.
 *
 * HeyGen API: GET https://api.heygen.com/v3/videos/{video_id}
 */
export async function getVideoStatus(
  videoId: string,
): Promise<HeyGenVideoStatus> {
  const data = await heygenFetch<{
    status: string
    video_url: string | null
    thumbnail_url: string | null
    duration: number | null
    error: string | null
    failure_message?: string | null
  }>(`/v3/videos/${encodeURIComponent(videoId)}`)

  // Map HeyGen statuses to our normalised interface
  const statusMap: Record<string, HeyGenVideoStatus['status']> = {
    pending: 'pending',
    processing: 'processing',
    completed: 'completed',
    failed: 'failed',
  }

  return {
    status: statusMap[data.status] ?? 'pending',
    videoUrl: data.video_url ?? null,
    thumbnailUrl: data.thumbnail_url ?? null,
    duration: data.duration ?? null,
    error: data.error ?? data.failure_message ?? null,
  }
}

/**
 * List available HeyGen avatars.
 *
 * HeyGen API: GET https://api.heygen.com/v2/avatars
 */
export async function listAvatars(): Promise<HeyGenAvatar[]> {
  const data = await heygenFetch<{
    avatars: Array<{
      avatar_id: string
      avatar_name: string
      gender: string
      preview_image_url?: string | null
    }>
  }>('/v2/avatars')

  return data.avatars.map((a) => ({
    avatarId: a.avatar_id,
    avatarName: a.avatar_name,
    gender: a.gender,
    previewUrl: a.preview_image_url ?? null,
  }))
}
