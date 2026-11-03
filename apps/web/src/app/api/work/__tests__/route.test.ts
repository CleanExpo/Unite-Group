import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/work/classifier', () => ({ classifyWork: vi.fn() }))
vi.mock('@/lib/error-reporting', () => ({
  sanitiseError: vi.fn((_e: unknown, fallback: string) => fallback),
}))

import { getUser } from '@/lib/supabase/server'
import { classifyWork } from '@/lib/work/classifier'
import { sanitiseError } from '@/lib/error-reporting'
import { POST } from '../route'

function req(body: unknown) {
  return new Request('http://localhost/api/work', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/work', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUser).mockResolvedValue({ id: 'user-123' } as never)
  })

  it('refuses unauthenticated requests and does not classify', async () => {
    vi.mocked(getUser).mockResolvedValue(null as never)
    const res = await POST(req({ description: 'x' }))
    expect(res.status).toBe(401)
    expect(classifyWork).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON', async () => {
    const res = await POST(req('{nope'))
    expect(res.status).toBe(400)
    expect(classifyWork).not.toHaveBeenCalled()
  })

  it('rejects a blank description', async () => {
    const res = await POST(req({ description: '   ' }))
    expect(res.status).toBe(400)
    expect(classifyWork).not.toHaveBeenCalled()
  })

  it('rejects an over-long description', async () => {
    const res = await POST(req({ description: 'a'.repeat(4001) }))
    expect(res.status).toBe(400)
    expect(classifyWork).not.toHaveBeenCalled()
  })

  it('classifies a valid description with trimmed context', async () => {
    const result = { intent: { system: 's', workType: 'w' }, confidence: 0.9, suggestedTitle: 'T' }
    vi.mocked(classifyWork).mockResolvedValue(result as never)
    const res = await POST(req({ description: '  fix it  ', context: '  ctx ' }))
    expect(res.status).toBe(200)
    expect(classifyWork).toHaveBeenCalledWith('fix it', 'ctx')
    expect(await res.json()).toEqual(result)
  })

  it('returns 500 with a generic message and logs the real error server-side (UNI-3079)', async () => {
    const err = new Error('llm down: key sk-internal at 10.0.0.4')
    vi.mocked(classifyWork).mockRejectedValue(err)
    const res = await POST(req({ description: 'fix it' }))
    expect(res.status).toBe(500)
    const json = (await res.json()) as { error: string }
    expect(json.error).toBe('Classification service unavailable')
    expect(JSON.stringify(json)).not.toContain('llm down')
    expect(sanitiseError).toHaveBeenCalledWith(
      err,
      'Classification service unavailable',
      expect.objectContaining({ route: 'work' }),
    )
  })
})
