import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { embedNexusPageOnWrite } from '../embed-on-write'
import { embed } from '../embed'

vi.mock('../embed', () => ({
  embed: vi.fn(async () => [0.1, 0.2]),
}))

function mockSupabase(updateError: { message: string } | null = null) {
  const eq = vi.fn(async () => ({ error: updateError }))
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  return { client: { from } as unknown as SupabaseClient, from, update, eq }
}

beforeEach(() => {
  vi.mocked(embed).mockReset()
  vi.mocked(embed).mockResolvedValue([0.1, 0.2])
})

describe('embedNexusPageOnWrite', () => {
  it('embeds the page text and stores the vector on nexus_pages', async () => {
    const { client, from, update, eq } = mockSupabase()

    await expect(embedNexusPageOnWrite(client, 'page-1', 'About the business')).resolves.toBe(true)

    expect(embed).toHaveBeenCalledWith('About the business')
    expect(from).toHaveBeenCalledWith('nexus_pages')
    expect(update).toHaveBeenCalledWith({ embedding: JSON.stringify([0.1, 0.2]) })
    expect(eq).toHaveBeenCalledWith('id', 'page-1')
  })

  it('swallows an embedding failure — the write must not fail', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(embed).mockRejectedValue(new Error('[rag] OPENAI_API_KEY not configured'))
    const { client, update } = mockSupabase()

    await expect(embedNexusPageOnWrite(client, 'page-1', 'text')).resolves.toBe(false)

    expect(update).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('embed-on-write failed for nexus_pages page-1')
    warn.mockRestore()
  })

  it('swallows a DB update failure — the write must not fail', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { client } = mockSupabase({ message: 'permission denied' })

    await expect(embedNexusPageOnWrite(client, 'page-1', 'text')).resolves.toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
