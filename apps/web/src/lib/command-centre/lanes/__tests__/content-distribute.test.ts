import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ContentDistributeDeps } from '../content-distribute'
import { runContentDistribute } from '../content-distribute'

const contentRow = {
  id: 'gc-1',
  founder_id: 'founder-1',
  business_key: 'biz-1',
  title: 'Post 1',
  body: 'Body of post 1',
  hashtags: ['#ai', '#marketing'],
  platform: 'instagram',
  media_urls: [],
}

function makeDeps(overrides: Partial<ContentDistributeDeps> = {}): ContentDistributeDeps {
  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'generated_content') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: contentRow, error: null }),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
            })),
          })),
        }
      }
      if (table === 'social_posts') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'sp-1', status: 'draft' }, error: null }),
            })),
          })),
        }
      }
      return {}
    }),
  }

  return {
    getTaskById: vi.fn().mockResolvedValue({
      id: 'task-1',
      founder_id: 'founder-1',
      title: 'Test',
      objective: 'test',
      metadata: { content: { generatedContentIds: ['gc-1', 'gc-2'], status: 'built' } },
    }),
    mergeTaskMetadata: vi.fn().mockResolvedValue({}),
    appendTaskEvent: vi.fn().mockResolvedValue({}),
    supabase: supabase as unknown as ContentDistributeDeps['supabase'],
    ...overrides,
  }
}

describe('runContentDistribute', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns not_built when no generatedContentIds in metadata', async () => {
    const deps = makeDeps({
      getTaskById: vi.fn().mockResolvedValue({
        id: 'task-1',
        founder_id: 'founder-1',
        title: 'Test',
        objective: 'test',
        metadata: {},
      }),
    })
    const result = await runContentDistribute({ founderId: 'founder-1', taskId: 'task-1' }, deps)
    expect(result.status).toBe('not_built')
  })

  it('promotes each content item, marks distributed, returns postsCreated', async () => {
    const deps = makeDeps()
    const result = await runContentDistribute({ founderId: 'founder-1', taskId: 'task-1' }, deps)

    expect(result.status).toBe('distributed')
    expect(result.postsCreated).toBe(2)
    expect(deps.mergeTaskMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        patch: expect.objectContaining({
          content: expect.objectContaining({ status: 'distributed' }),
        }),
      }),
    )
    expect(deps.appendTaskEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'comment', actor: 'content-lane' }),
    )
  })

  it('skips content rows not found (graceful)', async () => {
    const deps = makeDeps()
    let selectCallCount = 0
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'generated_content') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockImplementation(() => {
                    selectCallCount++
                    if (selectCallCount === 1) return Promise.resolve({ data: contentRow, error: null })
                    return Promise.resolve({ data: null, error: { message: 'Not found' } })
                  }),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
              })),
            })),
          }
        }
        if (table === 'social_posts') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 'sp-1', status: 'draft' }, error: null }),
              })),
            })),
          }
        }
        return {}
      }),
    }
    deps.supabase = supabase as unknown as ContentDistributeDeps['supabase']

    const result = await runContentDistribute({ founderId: 'founder-1', taskId: 'task-1' }, deps)
    expect(result.status).toBe('distributed')
    expect(result.postsCreated).toBe(1) // only the found one was promoted
  })
})
