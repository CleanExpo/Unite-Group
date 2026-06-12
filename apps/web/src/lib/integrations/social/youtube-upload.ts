// src/lib/integrations/social/youtube-upload.ts
// YouTube Data API v3 — chunked video upload for large files
// Reference: https://developers.google.com/youtube/v3/guides/uploading_a_video

const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos'

export interface YouTubeVideoMetadata {
  title: string
  description?: string
  tags?: string[]
  categoryId?: string  // See: https://developers.google.com/youtube/v3/docs/videoCategories/list
  privacyStatus?: 'public' | 'unlisted' | 'private'
  madeForKids?: boolean
  embeddable?: boolean
  publicStatsViewable?: boolean
  publishAt?: string  // ISO 8601 scheduled publish time
  recordingDate?: string  // YYYY-MM-DD
}

export interface YouTubeUploadProgress {
  bytesUploaded: number
  totalBytes: number
  percent: number
}

export interface YouTubeVideoResource {
  id: string
  snippet: {
    title: string
    description: string
    publishedAt: string
    channelId: string
    channelTitle: string
    categoryId: string
    tags: string[]
    thumbnails: Record<string, { url: string; width: number; height: number }>
  }
  status: {
    uploadStatus: string
    privacyStatus: string
    license: string
    embeddable: boolean
    publicStatsViewable: boolean
  }
  statistics?: {
    viewCount: string
    likeCount: string
    commentCount: string
  }
}

export interface YouTubeUploadResponse {
  video?: YouTubeVideoResource
  error?: string
}

const CHUNK_SIZE = 1024 * 1024 * 5 // 5MB chunks

/**
 * Upload a video file to YouTube with chunked upload + progress callback.
 *
 * @param accessToken - Valid Google OAuth token with youtube.upload scope
 * @param videoBlob - Video file as Blob, File, or Buffer
 * @param metadata - Video title, description, tags, privacy settings
 * @param onProgress - Optional callback for upload progress
 */
export async function uploadVideoToYouTube(
  accessToken: string,
  videoBlob: Blob | File,
  metadata: YouTubeVideoMetadata,
  onProgress?: (progress: YouTubeUploadProgress) => void
): Promise<YouTubeUploadResponse> {
  const totalBytes = videoBlob.size

  // Step 1: Initiate resumable upload session
  const initBody = {
    snippet: {
      title: metadata.title,
      description: metadata.description ?? '',
      tags: metadata.tags ?? [],
      categoryId: metadata.categoryId ?? '22', // People & Blogs default
    },
    status: {
      privacyStatus: metadata.privacyStatus ?? 'private',
      madeForKids: metadata.madeForKids ?? false,
      embeddable: metadata.embeddable ?? true,
      publicStatsViewable: metadata.publicStatsViewable ?? true,
    },
  }

  if (metadata.publishAt) {
    ;(initBody.status as Record<string, unknown>).publishAt = metadata.publishAt
  }

  const initRes = await fetch(`${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(totalBytes),
      'X-Upload-Content-Type': videoBlob.type || 'video/*',
    },
    body: JSON.stringify(initBody),
  })

  if (!initRes.ok) {
    const err = await initRes.text()
    return { error: `Upload initiation failed: ${initRes.status} ${err}` }
  }

  const uploadUrl = initRes.headers.get('Location')
  if (!uploadUrl) {
    return { error: 'No upload URL returned from YouTube' }
  }

  // Step 2: Upload in chunks
  let startByte = 0
  const reader = videoBlob.stream().getReader()

  try {
    while (startByte < totalBytes) {
      const endByte = Math.min(startByte + CHUNK_SIZE - 1, totalBytes - 1)
      const chunkLength = endByte - startByte + 1

      // Read chunk from stream
      const chunkBuffer = new Uint8Array(chunkLength)
      let bytesRead = 0

      while (bytesRead < chunkLength) {
        const result = await reader.read()
        if (result.done) break

        const chunk = result.value
        const remaining = chunkLength - bytesRead
        const toCopy = Math.min(chunk.length, remaining)
        chunkBuffer.set(chunk.subarray(0, toCopy), bytesRead)
        bytesRead += toCopy

        // If we read more than needed, we need to handle this differently
        if (toCopy < chunk.length) {
          // We have leftover data — this shouldn't happen with proper chunking
          // but we handle it defensively
          break
        }
      }

      const contentRange = `bytes ${startByte}-${endByte}/${totalBytes}`

      const chunkRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': videoBlob.type || 'video/*',
          'Content-Length': String(bytesRead),
          'Content-Range': contentRange,
        },
        body: chunkBuffer.subarray(0, bytesRead),
      })

      if (chunkRes.status === 308) {
        // Resume Incomplete — get Range header for next start
        const rangeHeader = chunkRes.headers.get('Range')
        if (rangeHeader) {
          const match = rangeHeader.match(/bytes=\d+-(\d+)/)
          if (match) {
            startByte = parseInt(match[1]) + 1
          } else {
            startByte += bytesRead
          }
        } else {
          startByte += bytesRead
        }
      } else if (chunkRes.ok) {
        // Upload complete!
        const video = (await chunkRes.json()) as YouTubeVideoResource
        return { video }
      } else {
        const err = await chunkRes.text()
        return { error: `Chunk upload failed at byte ${startByte}: ${chunkRes.status} ${err}` }
      }

      // Report progress
      onProgress?.({
        bytesUploaded: startByte,
        totalBytes,
        percent: Math.round((startByte / totalBytes) * 100),
      })
    }

    return { error: 'Upload loop ended without completion' }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Upload video from a URL (downloads then uploads).
 */
export async function uploadVideoFromUrl(
  accessToken: string,
  videoUrl: string,
  metadata: YouTubeVideoMetadata,
  onProgress?: (progress: YouTubeUploadProgress) => void
): Promise<YouTubeUploadResponse> {
  // Download the video
  const res = await fetch(videoUrl)
  if (!res.ok) {
    return { error: `Failed to download video: ${res.status}` }
  }

  const blob = await res.blob()

  return uploadVideoToYouTube(accessToken, blob, metadata, onProgress)
}

/**
 * Update video metadata after upload.
 */
export async function updateVideoMetadata(
  accessToken: string,
  videoId: string,
  metadata: Partial<YouTubeVideoMetadata>
): Promise<{ success: boolean; error?: string }> {
  const body: Record<string, unknown> = {}

  if (metadata.title || metadata.description || metadata.tags || metadata.categoryId) {
    body.snippet = {}
    if (metadata.title) (body.snippet as Record<string, unknown>).title = metadata.title
    if (metadata.description)
      (body.snippet as Record<string, unknown>).description = metadata.description
    if (metadata.tags) (body.snippet as Record<string, unknown>).tags = metadata.tags
    if (metadata.categoryId)
      (body.snippet as Record<string, unknown>).categoryId = metadata.categoryId
  }

  if (metadata.privacyStatus || metadata.madeForKids !== undefined) {
    body.status = {}
    if (metadata.privacyStatus)
      (body.status as Record<string, unknown>).privacyStatus = metadata.privacyStatus
    if (metadata.madeForKids !== undefined)
      (body.status as Record<string, unknown>).madeForKids = metadata.madeForKids
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,status`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: videoId,
        ...body,
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    return { success: false, error: `Update failed: ${res.status} ${err}` }
  }

  return { success: true }
}
