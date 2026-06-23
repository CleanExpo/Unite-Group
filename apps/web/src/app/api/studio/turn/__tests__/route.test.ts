import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/command-centre/tasks', () => ({
  getTaskById: vi.fn(), mergeTaskMetadata: vi.fn(), appendTaskEvent: vi.fn(),
}))
vi.mock('@/lib/studio/studio-brand', () => ({ resolveStudioBrand: vi.fn() }))
vi.mock('@/lib/studio/generate-visuals', () => ({ generateVisuals: vi.fn() }))
vi.mock('@/lib/studio/studio-storage', () => ({ uploadConceptImage: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { getTaskById, mergeTaskMetadata } from '@/lib/command-centre/tasks'
import { resolveStudioBrand } from '@/lib/studio/studio-brand'
import { generateVisuals } from '@/lib/studio/generate-visuals'
import { uploadConceptImage } from '@/lib/studio/studio-storage'
import { POST } from '../route'

const req = (b: object) => new Request('https://app.test/api/studio/turn', { method: 'POST', body: JSON.stringify(b) })

describe('POST /api/studio/turn', () => {
  beforeEach(() => vi.clearAllMocks())

  it('401 when unauthenticated', async () => {
    vi.mocked(getUser).mockResolvedValue(null)
    expect((await POST(req({ taskId: 't', message: 'm' }))).status).toBe(401)
  })

  it('400 when message is missing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    expect((await POST(req({ taskId: 't' }))).status).toBe(400)
  })

  it('404 when the task is not the founder’s', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue(null)
    expect((await POST(req({ taskId: 't', message: 'm' }))).status).toBe(404)
  })

  it('returns not_connected when no brand resolves', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: 't', metadata: {} } as never)
    vi.mocked(resolveStudioBrand).mockResolvedValue(null)
    const res = await POST(req({ taskId: 't', message: 'm' }))
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe('not_connected')
  })

  it('generates concepts, uploads, persists studio session, returns ok', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: 't', metadata: {} } as never)
    vi.mocked(resolveStudioBrand).mockResolvedValue({ brand: {}, brandDNA: {} } as never)
    vi.mocked(generateVisuals).mockResolvedValue({ images: [{ imageBase64: 'AAA', mimeType: 'image/png' }], errors: [] } as never)
    vi.mocked(uploadConceptImage).mockResolvedValue('https://cdn/c.png')
    vi.mocked(mergeTaskMetadata).mockResolvedValue({} as never)
    const res = await POST(req({ taskId: 't', message: 'winter promo' }))
    expect(res.status).toBe(200)
    const b = await res.json()
    expect(b.status).toBe('ok')
    expect(b.concepts).toHaveLength(1)
    expect(b.concepts[0].url).toBe('https://cdn/c.png')
    expect(mergeTaskMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ patch: expect.objectContaining({ studio: expect.objectContaining({ concepts: expect.any(Array) }) }) }),
    )
  })

  it('surfaces errors honestly when generation yields nothing', async () => {
    vi.mocked(getUser).mockResolvedValue({ id: 'u1' } as never)
    vi.mocked(getTaskById).mockResolvedValue({ id: 't', metadata: {} } as never)
    vi.mocked(resolveStudioBrand).mockResolvedValue({ brand: {}, brandDNA: {} } as never)
    vi.mocked(generateVisuals).mockResolvedValue({ images: [], errors: ['quota exceeded'] } as never)
    vi.mocked(mergeTaskMetadata).mockResolvedValue({} as never)
    const res = await POST(req({ taskId: 't', message: 'm' }))
    const b = await res.json()
    expect(b.status).toBe('ok')
    expect(b.concepts).toEqual([])
    expect(b.errors).toContain('quota exceeded')
  })
})
