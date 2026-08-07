// Brand-video queue → GitHub Actions workflow_dispatch (UNI-2373 P5).
// Vercel cannot run ffmpeg; the real renderer lives in
// `.github/workflows/brand-video-render.yml`. This module is the thin
// processor that wakes that workflow when `brand_video_jobs` has queued rows.

export const BRAND_VIDEO_WORKFLOW_FILE = 'brand-video-render.yml'
export const DEFAULT_BRAND_VIDEO_REPO = {
  owner: 'CleanExpo',
  repo: 'Unite-Group',
} as const

export type BrandVideoDispatchDecision =
  | { action: 'skip'; reason: 'empty_queue'; queued: number }
  | { action: 'skip'; reason: 'github_not_configured'; queued: number }
  | { action: 'skip'; reason: 'dispatch_disabled'; queued: number }
  | { action: 'dispatch'; queued: number }

export function decideBrandVideoDispatch(input: {
  queued: number
  githubTokenConfigured: boolean
  /** When false, count queue but never fire workflow_dispatch (safe default in preview). */
  dispatchEnabled: boolean
}): BrandVideoDispatchDecision {
  const queued = Math.max(0, input.queued)
  if (queued === 0) {
    return { action: 'skip', reason: 'empty_queue', queued: 0 }
  }
  if (!input.githubTokenConfigured) {
    return { action: 'skip', reason: 'github_not_configured', queued }
  }
  if (!input.dispatchEnabled) {
    return { action: 'skip', reason: 'dispatch_disabled', queued }
  }
  return { action: 'dispatch', queued }
}

/** True when BRAND_VIDEO_DISPATCH_LIVE === '1' (explicit arming, like CC_LINEAR_LIVE). */
export function isBrandVideoDispatchLive(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.BRAND_VIDEO_DISPATCH_LIVE?.trim() === '1'
}

export async function dispatchBrandVideoWorkflow(input: {
  token: string
  owner?: string
  repo?: string
  ref?: string
  fetchImpl?: typeof fetch
}): Promise<{ ok: true; status: number } | { ok: false; status: number; message: string }> {
  const owner = input.owner ?? DEFAULT_BRAND_VIDEO_REPO.owner
  const repo = input.repo ?? DEFAULT_BRAND_VIDEO_REPO.repo
  const ref = input.ref ?? 'main'
  const fetchImpl = input.fetchImpl ?? fetch
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(BRAND_VIDEO_WORKFLOW_FILE)}/dispatches`

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${input.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref }),
  })

  if (res.status === 204 || res.ok) {
    return { ok: true, status: res.status || 204 }
  }

  let message = `GitHub workflow_dispatch failed (${res.status})`
  try {
    const body = (await res.json()) as { message?: string }
    if (body.message) message = body.message
  } catch {
    // ignore parse errors
  }
  return { ok: false, status: res.status, message }
}
