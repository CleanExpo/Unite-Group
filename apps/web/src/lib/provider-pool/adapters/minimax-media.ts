// src/lib/provider-pool/adapters/minimax-media.ts
//
// MiniMax async media (video / voice / music) client. These endpoints are
// create-task → poll: a POST returns a `task_id`, then a separate query
// endpoint reports progress until a file URL is ready.
//
// PURE of network via an injected fetch (no global fetch reliance, no new
// dependency). Honest by construction, matching repo-campaigns-github.ts: with
// no API key it returns `not_configured` WITHOUT touching the network; any
// non-2xx or thrown error becomes an `error` variant. It NEVER throws.
//
// NOTE: MiniMax media endpoints are group-scoped — `GroupId` is appended as a
// query parameter when provided. Callers should pass it for real traffic.

export type MediaKind = 'video' | 'voice' | 'music'

export interface MediaRequest {
  kind: MediaKind
  prompt: string
  model: string
  groupId?: string
}

export interface MediaTaskCreated {
  ok: true
  taskId: string
}

export interface MediaErr {
  ok: false
  reason: 'not_configured' | 'error'
  detail?: string
}

export interface MediaStatus {
  ok: true
  status: 'queued' | 'processing' | 'success' | 'failed'
  /** The finished asset URL when the task has succeeded; null otherwise. */
  fileUrl?: string | null
}

export interface MiniMaxMediaConfig {
  apiKey: string | undefined
  baseUrl?: string
  fetchFn?: typeof fetch
}

/** Create-task POST path per media kind. */
const CREATE_PATH: Record<MediaKind, string> = {
  video: '/v1/video_generation',
  voice: '/v1/t2a_v2',
  music: '/v1/music_generation',
}

/** The create-task response shape we read (loosely typed). */
interface CreateTaskResponse {
  task_id?: string
}

/** The poll response shape we read (loosely typed). */
interface QueryTaskResponse {
  status?: string
  /** MiniMax surfaces the finished asset under one of these, depending on kind. */
  file_url?: string | null
  download_url?: string | null
}

/** Append `?GroupId=` (or `&GroupId=`) when a group id is supplied. */
function withGroupId(url: string, groupId?: string): string {
  if (!groupId) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}GroupId=${encodeURIComponent(groupId)}`
}

/** Map MiniMax's status string onto our four-state union (defaults to queued). */
function mapStatus(raw: string | undefined): MediaStatus['status'] {
  switch ((raw ?? '').toLowerCase()) {
    case 'success':
    case 'succeeded':
    case 'success_complete':
      return 'success'
    case 'fail':
    case 'failed':
      return 'failed'
    case 'processing':
    case 'running':
    case 'preparing':
      return 'processing'
    default:
      return 'queued'
  }
}

/**
 * Build a MiniMax media client. `createTask` kicks off an async generation and
 * returns its `task_id`; `pollTask` queries that task and maps the provider
 * status onto queued/processing/success/failed, surfacing the file URL when
 * present. Neither method throws — failures come back as an `error` variant.
 */
export function makeMiniMaxMediaClient(cfg: MiniMaxMediaConfig): {
  createTask(req: MediaRequest): Promise<MediaTaskCreated | MediaErr>
  pollTask(taskId: string, groupId?: string): Promise<MediaStatus | MediaErr>
} {
  const fetchFn = cfg.fetchFn ?? fetch
  const apiKey = cfg.apiKey
  const baseUrl = (cfg.baseUrl ?? 'https://api.minimax.io').replace(/\/+$/, '')

  return {
    async createTask(req: MediaRequest): Promise<MediaTaskCreated | MediaErr> {
      // No credential → honest not_configured, with no network call.
      if (!apiKey) return { ok: false, reason: 'not_configured' }

      try {
        const url = withGroupId(`${baseUrl}${CREATE_PATH[req.kind]}`, req.groupId)
        const res = await fetchFn(url, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ model: req.model, prompt: req.prompt }),
        })

        if (!res.ok) return { ok: false, reason: 'error', detail: `HTTP ${res.status}` }

        const data = (await res.json()) as CreateTaskResponse
        if (!data.task_id) return { ok: false, reason: 'error', detail: 'no task_id in response' }
        return { ok: true, taskId: data.task_id }
      } catch (err) {
        return { ok: false, reason: 'error', detail: err instanceof Error ? err.message : 'fetch failed' }
      }
    },

    async pollTask(taskId: string, groupId?: string): Promise<MediaStatus | MediaErr> {
      // No credential → honest not_configured, with no network call.
      if (!apiKey) return { ok: false, reason: 'not_configured' }

      try {
        // Single generic query endpoint keeps this simple — MiniMax routes by
        // task_id, so one path serves all three media kinds.
        const base = `${baseUrl}/v1/query/generation?task_id=${encodeURIComponent(taskId)}`
        const res = await fetchFn(withGroupId(base, groupId), {
          method: 'GET',
          headers: { authorization: `Bearer ${apiKey}` },
        })

        if (!res.ok) return { ok: false, reason: 'error', detail: `HTTP ${res.status}` }

        const data = (await res.json()) as QueryTaskResponse
        const status = mapStatus(data.status)
        return {
          ok: true,
          status,
          fileUrl: status === 'success' ? data.file_url ?? data.download_url ?? null : null,
        }
      } catch (err) {
        return { ok: false, reason: 'error', detail: err instanceof Error ? err.message : 'fetch failed' }
      }
    },
  }
}
