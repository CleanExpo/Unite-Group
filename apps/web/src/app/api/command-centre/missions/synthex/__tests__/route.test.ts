import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', async (orig) => ({ ...(await orig<typeof import('@/lib/command-centre/tasks')>()), getTaskById: vi.fn() }))
vi.mock('@/lib/command-centre/synthex-mission-timeline', () => ({ loadSynthexMissionTimeline: vi.fn() }))
import { getUser } from '@/lib/supabase/server'
import { getTaskById } from '@/lib/command-centre/tasks'
import { loadSynthexMissionTimeline } from '@/lib/command-centre/synthex-mission-timeline'
import { GET } from '../route'

const founder = 'b0000000-0000-4000-8000-000000000001'
const taskId = 'b0000000-0000-4000-8000-000000000002'
const get = (id: string | null = taskId) => GET(new Request(`https://app.test/api/command-centre/missions/synthex${id === null ? '' : `?taskId=${id}`}`))

describe('GET /api/command-centre/missions/synthex', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: founder } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: taskId, founder_id: founder } as never)
    vi.mocked(loadSynthexMissionTimeline).mockResolvedValue({ taskId, entries: [], unlinked: [], truncated: false })
  })

  it('401s without a session and reads nothing', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    expect((await get()).status).toBe(401)
    expect(loadSynthexMissionTimeline).not.toHaveBeenCalled()
  })

  it('400s an invalid taskId', async () => {
    expect((await get('nope')).status).toBe(400)
    expect((await get(null)).status).toBe(400)
  })

  it('404s a mission that is not the founder’s', async () => {
    vi.mocked(getTaskById).mockResolvedValue(null)
    expect((await get()).status).toBe(404)
    expect(loadSynthexMissionTimeline).not.toHaveBeenCalled()
  })

  it('500s with an error and no entries when the read fails', async () => {
    vi.mocked(loadSynthexMissionTimeline).mockRejectedValue(new Error('db'))
    const res = await get()
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.entries).toBeUndefined()
    expect(body.error).toMatch(/could not be read/)
  })

  it('returns the founder-scoped timeline, uncached', async () => {
    const res = await get()
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(await res.json()).toEqual({ taskId, entries: [], unlinked: [], truncated: false })
    expect(loadSynthexMissionTimeline).toHaveBeenCalledWith(founder, taskId)
  })
})
