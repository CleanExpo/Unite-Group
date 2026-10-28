import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ getUser: vi.fn() }))
vi.mock('@/lib/work/classifier', () => ({ classifyWork: vi.fn() }))

import { getUser } from '@/lib/supabase/server'
import { classifyWork } from '@/lib/work/classifier'
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

  it('returns 500 when the classifier fails', async () => {
    vi.mocked(classifyWork).mockRejectedValue(new Error('llm down'))
    const res = await POST(req({ description: 'fix it' }))
    expect(res.status).toBe(500)
    expect(((await res.json()) as { error: string }).error).toBe('llm down')
  })
})
