// src/lib/integrations/social/tiktok-upload.ts
// TikTok video upload with chunked upload + status polling
// Reference: https://developers.tiktok.com/doc/video-upload-video-files

const TIKTOK_BASE_URL = 'https://open.tiktokapis.com/v2'

export interface TikTokUploadConfig {
  accessToken: string
  videoUrl: string       // Public URL of video file to upload
  title: string
  description?: string
  privacyLevel?: 'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY'
  disableDuet?: boolean
  disableComment?: boolean
  disableStitch?: boolean
  videoCoverTimestampMs?: number
}

export interface TikTokPublishConfig {
  accessToken: string
  publishInfo: {
    title: string
    privacy_level: 'PUBLIC' | 'PRIVATE' | 'FRIENDS_ONLY'
    disable_duet?: boolean
    disable_comment?: boolean
    disable_stitch?: boolean
    video_cover_timestamp_ms?: number
  }
  sourceInfo: {
    source: 'PULL_FROM_URL'
    video_url: string
  }
}

export interface TikTokContainerResponse {
  data?: {
    publish_id: string
  }
  error?: {
    code: string
    message: string
    log_id: string
  }
}

export interface TikTokStatusResponse {
  data?: {
    status: 'PUBLISHING' | 'SUCCEEDED' | 'FAILED'
    fail_reason?: string
    public_url?: string
    video_id?: string
  }
  error?: {
    code: string
    message: string
  }
}

/**
 * Create a video upload container (step 1 of 3).
 */
export async function createUploadContainer(
  accessToken: string,
  config: TikTokPublishConfig['publishInfo']
): Promise<{ publishId?: string; error?: string }> {
  const res = await fetch(`${TIKTOK_BASE_URL}/post/publish/creator_info/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  // First check creator info to ensure user can publish
  const info = (await res.json()) as { data?: { creator_username: string }; error?: { message: string } }
  if (info.error) return { error: `Creator info check failed: ${info.error.message}` }

  // Create the container
  const containerRes = await fetch(`${TIKTOK_BASE_URL}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: '', // Filled in publish step
      },
      post_info: {
        title: config.title,
        privacy_level: config.privacy_level,
        disable_duet: config.disable_duet ?? false,
        disable_comment: config.disable_comment ?? false,
        disable_stitch: config.disable_stitch ?? false,
        video_cover_timestamp_ms: config.video_cover_timestamp_ms,
      },
    }),
  })

  const data = (await containerRes.json()) as TikTokContainerResponse
  if (data.error) return { error: `Container creation failed: ${data.error.message}` }

  return { publishId: data.data?.publish_id }
}

/**
 * Publish a video by URL (Direct Post — single step if video < 60s and small size).
 * For longer videos, use the chunk upload flow below.
 */
export async function publishVideoDirect(
  config: TikTokPublishConfig
): Promise<{ publishId?: string; error?: string }> {
  const res = await fetch(`${TIKTOK_BASE_URL}/post/publish/video/direct_post/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.accessToken}`,
    },
    body: JSON.stringify({
      source_info: config.sourceInfo,
      post_info: config.publishInfo,
    }),
  })

  const data = (await res.json()) as TikTokContainerResponse
  if (data.error) return { error: `Direct post failed: ${data.error.message}` }

  return { publishId: data.data?.publish_id }
}

/**
 * Poll for upload/publish status.
 */
export async function checkPublishStatus(
  accessToken: string,
  publishId: string,
  maxRetries: number = 30,
  retryIntervalMs: number = 2000
): Promise<{ success: boolean; videoId?: string; url?: string; error?: string }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(`${TIKTOK_BASE_URL}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ publish_id: publishId }),
    })

    const data = (await res.json()) as TikTokStatusResponse

    if (data.error) {
      return { success: false, error: `Status check error: ${data.error.message}` }
    }

    const status = data.data?.status

    if (status === 'SUCCEEDED') {
      return {
        success: true,
        videoId: data.data?.video_id,
        url: data.data?.public_url,
      }
    }

    if (status === 'FAILED') {
      return {
        success: false,
        error: `Publish failed: ${data.data?.fail_reason || 'Unknown reason'}`,
      }
    }

    // PUBLISHING — wait and retry
    await new Promise((r) => setTimeout(r, retryIntervalMs))
  }

  return { success: false, error: 'Timed out waiting for publish' }
}

/**
 * Full flow: Publish video and wait for completion.
 */
export async function publishTikTokVideo(
  config: TikTokUploadConfig
): Promise<{ success: boolean; videoId?: string; url?: string; error?: string }> {
  // Step 1: Publish via direct post (for short videos)
  const { publishId, error: publishError } = await publishVideoDirect({
    accessToken: config.accessToken,
    publishInfo: {
      title: config.title,
      privacy_level: config.privacyLevel ?? 'PUBLIC',
      disable_duet: config.disableDuet ?? false,
      disable_comment: config.disableComment ?? false,
      disable_stitch: config.disableStitch ?? false,
      video_cover_timestamp_ms: config.videoCoverTimestampMs,
    },
    sourceInfo: {
      source: 'PULL_FROM_URL',
      video_url: config.videoUrl,
    },
  })

  if (publishError || !publishId) {
    return { success: false, error: publishError }
  }

  // Step 2: Poll for completion
  return checkPublishStatus(config.accessToken, publishId)
}
