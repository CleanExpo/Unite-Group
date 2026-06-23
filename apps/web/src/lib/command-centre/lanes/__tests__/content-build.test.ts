import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ContentBuildDeps } from '../content-build'
import { runContentBuild } from '../content-build'

function makeDeps(overrides: Partial<ContentBuildDeps> = {}): ContentBuildDeps {
  const brand = {
    id: 'brand-1',
    founder_id: 'founder-1',
    business_key: 'biz-1',
    tone_of_voice: 'professional',
    target_audience: 'SMBs',
    industry_keywords: ['marketing'],
    unique_selling_points: ['AI-powered'],
    character_male: { name: 'Bob', persona: 'advisor', avatarUrl: null, voiceStyle: 'calm' },
    character_female: { name: 'Alice', persona: 'coach', avatarUrl: null, voiceStyle: 'warm' },
    colour_primary: '#00F5FF',
    colour_secondary: null,
    do_list: ['be direct'],
    dont_list: ['be vague'],
    sample_content: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'brand_identities') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: brand, error: null }),
              })),
              single: vi.fn().mockResolvedValue({ data: brand, error: null }),
            })),
          })),
        }
      }
      if (table === 'generated_content') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'gc-1' }, error: null }),
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
      title: 'Test task',
      objective: 'Write a post about AI',
      metadata: { routing: { businessKey: 'biz-1', contentType: 'social_post' } },
    }),
    mergeTaskMetadata: vi.fn().mockResolvedValue({}),
    appendTaskEvent: vi.fn().mockResolvedValue({}),
    generateContent: vi.fn().mockResolvedValue([
      { title: 'Post 1', body: 'Body 1', hashtags: ['#ai'], cta: null, mediaPrompt: null, characterUsed: null, platform: null },
      { title: 'Post 2', body: 'Body 2', hashtags: [], cta: null, mediaPrompt: null, characterUsed: null, platform: null },
      { title: 'Post 3', body: 'Body 3', hashtags: [], cta: null, mediaPrompt: null, characterUsed: null, platform: null },
    ]),
    supabase: supabase as unknown as ContentBuildDeps['supabase'],
    ...overrides,
  }
}

describe('runContentBuild', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns not_connected when no brand identity found', async () => {
    const deps = makeDeps()
    const noBrandSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            })),
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          })),
        })),
      })),
    }
    deps.supabase = noBrandSupabase as unknown as ContentBuildDeps['supabase']

    const result = await runContentBuild({ founderId: 'founder-1', taskId: 'task-1' }, deps)
    expect(result.status).toBe('not_connected')
    expect(result.reason).toMatch(/brand identity/i)
  })

  it('generates content, inserts rows, merges metadata, returns built', async () => {
    const deps = makeDeps()
    const result = await runContentBuild({ founderId: 'founder-1', taskId: 'task-1' }, deps)

    expect(result.status).toBe('built')
    expect(result.count).toBe(3)
    expect(result.ids).toHaveLength(3)
    expect(deps.generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ contentType: 'social_post', topic: 'Write a post about AI' }),
      expect.objectContaining({ businessKey: 'biz-1' }),
    )
    expect(deps.mergeTaskMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        founderId: 'founder-1',
        taskId: 'task-1',
        patch: expect.objectContaining({
          content: expect.objectContaining({ status: 'built', count: 3 }),
        }),
      }),
    )
    expect(deps.appendTaskEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'comment', actor: 'content-lane' }),
    )
  })

  it('surfaces generation failure', async () => {
    const deps = makeDeps({
      generateContent: vi.fn().mockRejectedValue(new Error('AI quota exceeded')),
    })
    await expect(runContentBuild({ founderId: 'founder-1', taskId: 'task-1' }, deps)).rejects.toThrow('AI quota exceeded')
  })
})
